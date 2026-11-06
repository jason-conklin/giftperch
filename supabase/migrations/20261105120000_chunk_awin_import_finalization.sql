-- Makes large Awin imports resumable without exposing partially prepared
-- snapshots. Product visibility is selected by the active import pointer.

alter table public.affiliate_product_imports
  add column catalog_active boolean not null default false;

alter table public.affiliate_product_staging
  add column prepared_at timestamptz;

alter table public.affiliate_product_imports
  drop constraint affiliate_product_imports_status_check,
  add constraint affiliate_product_imports_status_check
    check (status in ('staging', 'preparing', 'completed', 'failed'));

drop index public.affiliate_product_imports_one_staging_feed;
create unique index affiliate_product_imports_one_pending_feed
on public.affiliate_product_imports(provider, advertiser_id, locale)
where status in ('staging', 'preparing');

-- Existing catalog rows are the active snapshot for their advertiser scope.
update public.affiliate_product_imports imports
set catalog_active = true
where exists (
  select 1
  from public.affiliate_products products
  where products.import_batch_id = imports.id
    and products.active = true
);

create unique index affiliate_product_imports_one_active_catalog
on public.affiliate_product_imports(provider, advertiser_id, locale)
where catalog_active = true;

alter table public.affiliate_products
  drop constraint affiliate_products_provider_advertiser_id_locale_external_p_key;

create unique index affiliate_products_import_external_product_key
on public.affiliate_products(
  provider,
  advertiser_id,
  locale,
  import_batch_id,
  external_product_id
);

create index affiliate_product_staging_import_preparation_idx
on public.affiliate_product_staging(import_id, prepared_at, external_product_id);

create or replace view public.affiliate_catalog_products
with (security_invoker = true)
as
select products.*
from public.affiliate_products products
join public.affiliate_product_imports imports
  on imports.id = products.import_batch_id
  and imports.catalog_active = true
where products.active = true;

revoke all on public.affiliate_catalog_products from public, anon, authenticated;
grant select on public.affiliate_catalog_products to service_role;

create or replace function public.prepare_affiliate_product_import_chunk(
  p_import_id uuid,
  p_batch_size integer default 500
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  current_import public.affiliate_product_imports%rowtype;
  prepared_count integer;
begin
  if p_batch_size < 1 or p_batch_size > 1000 then
    raise exception 'Import preparation batch size must be between 1 and 1000';
  end if;

  select * into current_import
  from public.affiliate_product_imports
  where id = p_import_id
  for update;

  if not found then
    raise exception 'Affiliate product import not found';
  end if;
  if current_import.status not in ('staging', 'preparing') then
    raise exception 'Affiliate product import is not resumable';
  end if;

  update public.affiliate_product_imports
  set status = 'preparing', error_message = null, completed_at = null
  where id = p_import_id
    and status = 'staging';

  with next_rows as materialized (
    select *
    from public.affiliate_product_staging
    where import_id = p_import_id
      and prepared_at is null
    order by external_product_id
    limit p_batch_size
    for update skip locked
  ), prepared_products as (
    insert into public.affiliate_products (
      provider, advertiser_id, merchant_name, external_product_id, locale,
      title, description, image_url, destination_url, affiliate_url, price,
      currency, availability, active, import_batch_id, imported_at, updated_at,
      source_category, classification_primary_category, classification_version,
      classification_confidence, classification_evidence,
      catalog_retrieval_bucket, catalog_retrieval_rank
    )
    select
      provider, advertiser_id, merchant_name, external_product_id, locale,
      title, description, image_url, destination_url, affiliate_url, price,
      currency, availability, true, p_import_id, imported_at, timezone('utc', now()),
      source_category, classification_primary_category, classification_version,
      classification_confidence, classification_evidence,
      mod((hashtextextended(
        provider || ':' || advertiser_id || ':' || locale || ':' || external_product_id,
        0
      ) & 9223372036854775807)::numeric, 16)::smallint,
      hashtextextended(
        provider || ':' || advertiser_id || ':' || locale || ':' || external_product_id,
        1
      )
    from next_rows
    on conflict (provider, advertiser_id, locale, import_batch_id, external_product_id)
    do update set
      merchant_name = excluded.merchant_name,
      title = excluded.title,
      description = excluded.description,
      image_url = excluded.image_url,
      destination_url = excluded.destination_url,
      affiliate_url = excluded.affiliate_url,
      price = excluded.price,
      currency = excluded.currency,
      availability = excluded.availability,
      active = true,
      imported_at = excluded.imported_at,
      updated_at = excluded.updated_at,
      source_category = excluded.source_category,
      classification_primary_category = excluded.classification_primary_category,
      classification_version = excluded.classification_version,
      classification_confidence = excluded.classification_confidence,
      classification_evidence = excluded.classification_evidence,
      catalog_retrieval_bucket = excluded.catalog_retrieval_bucket,
      catalog_retrieval_rank = excluded.catalog_retrieval_rank
    returning id, external_product_id
  ), replaced_facets as (
    delete from public.affiliate_product_facets facets
    using prepared_products products
    where facets.product_id = products.id
    returning facets.product_id
  ), inserted_facets as (
    insert into public.affiliate_product_facets (
      product_id, facet, classification_version, advertiser_id,
      catalog_retrieval_bucket, catalog_retrieval_rank
    )
    select
      products.id, facet, staged.classification_version, staged.advertiser_id,
      mod((hashtextextended(
        staged.provider || ':' || staged.advertiser_id || ':' || staged.locale || ':' || staged.external_product_id,
        0
      ) & 9223372036854775807)::numeric, 16)::smallint,
      hashtextextended(
        staged.provider || ':' || staged.advertiser_id || ':' || staged.locale || ':' || staged.external_product_id,
        1
      )
    from next_rows staged
    join prepared_products products
      on products.external_product_id = staged.external_product_id
    cross join lateral unnest(staged.classification_facets) as facet
    where staged.classification_version is not null
    on conflict (product_id, facet)
    do update set classification_version = excluded.classification_version,
      advertiser_id = excluded.advertiser_id,
      catalog_retrieval_bucket = excluded.catalog_retrieval_bucket,
      catalog_retrieval_rank = excluded.catalog_retrieval_rank
  ), marked_staging as (
    update public.affiliate_product_staging staged
    set prepared_at = timezone('utc', now())
    from next_rows selected
    where staged.import_id = selected.import_id
      and staged.external_product_id = selected.external_product_id
    returning staged.external_product_id
  )
  select count(*) into prepared_count from marked_staging;

  return prepared_count;
end;
$$;

create or replace function public.activate_prepared_affiliate_product_import(
  p_import_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  current_import public.affiliate_product_imports%rowtype;
  staged_count integer;
  prepared_count integer;
  active_count integer;
  required_count integer;
begin
  select * into current_import
  from public.affiliate_product_imports
  where id = p_import_id
  for update;

  if not found then
    raise exception 'Affiliate product import not found';
  end if;
  if current_import.status <> 'preparing' then
    raise exception 'Affiliate product import is not ready for activation';
  end if;

  select count(*) into staged_count
  from public.affiliate_product_staging
  where import_id = p_import_id;
  select count(*) into prepared_count
  from public.affiliate_product_staging
  where import_id = p_import_id
    and prepared_at is not null;

  if staged_count = 0 or staged_count <> current_import.valid_count
    or prepared_count <> staged_count then
    raise exception 'Affiliate product import has not prepared every validated row';
  end if;

  if exists (
    select 1
    from public.affiliate_product_staging
    where import_id = p_import_id
      and (provider <> current_import.provider
        or advertiser_id <> current_import.advertiser_id
        or locale <> current_import.locale)
  ) then
    raise exception 'Staged products do not match the import scope';
  end if;

  select count(*) into active_count
  from public.affiliate_catalog_products products
  where provider = current_import.provider
    and advertiser_id = current_import.advertiser_id
    and locale = current_import.locale;

  required_count := greatest(
    current_import.minimum_valid_count,
    ceiling(active_count::numeric * 0.8)::integer
  );
  if staged_count < required_count then
    raise exception 'Staged product count % is below required count %',
      staged_count, required_count;
  end if;

  update public.affiliate_product_imports
  set catalog_active = false
  where provider = current_import.provider
    and advertiser_id = current_import.advertiser_id
    and locale = current_import.locale
    and catalog_active = true;

  update public.affiliate_product_imports
  set status = 'completed', catalog_active = true,
    completed_at = timezone('utc', now()), error_message = null
  where id = p_import_id;

  return staged_count;
end;
$$;

create or replace function public.cleanup_prepared_affiliate_product_import_chunk(
  p_import_id uuid,
  p_batch_size integer default 1000
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  deleted_count integer;
begin
  if p_batch_size < 1 or p_batch_size > 5000 then
    raise exception 'Import cleanup batch size must be between 1 and 5000';
  end if;
  if not exists (
    select 1 from public.affiliate_product_imports
    where id = p_import_id and status = 'completed'
  ) then
    raise exception 'Only completed imports can be cleaned up';
  end if;

  with rows_to_delete as (
    select ctid
    from public.affiliate_product_staging
    where import_id = p_import_id
    order by external_product_id
    limit p_batch_size
  ), deleted_rows as (
    delete from public.affiliate_product_staging
    where ctid in (select ctid from rows_to_delete)
    returning external_product_id
  )
  select count(*) into deleted_count from deleted_rows;

  return deleted_count;
end;
$$;

create or replace function public.cleanup_inactive_affiliate_catalog_chunk(
  p_import_id uuid,
  p_batch_size integer default 500
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  deleted_count integer;
begin
  if p_batch_size < 1 or p_batch_size > 1000 then
    raise exception 'Catalog cleanup batch size must be between 1 and 1000';
  end if;
  if not exists (
    select 1 from public.affiliate_product_imports
    where id = p_import_id
      and status = 'completed'
      and catalog_active = false
  ) then
    raise exception 'Only inactive completed imports can be cleaned up';
  end if;

  with rows_to_delete as (
    select id
    from public.affiliate_products
    where import_batch_id = p_import_id
    order by id
    limit p_batch_size
  ), deleted_rows as (
    delete from public.affiliate_products
    where id in (select id from rows_to_delete)
    returning id
  )
  select count(*) into deleted_count from deleted_rows;

  return deleted_count;
end;
$$;

create or replace function public.resume_affiliate_product_import(
  p_import_id uuid
)
returns table (
  provider text,
  advertiser_id text,
  locale text,
  record_count integer,
  valid_count integer,
  skipped_count integer
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  return query
  update public.affiliate_product_imports imports
  set status = 'preparing', error_message = null, completed_at = null
  where imports.id = p_import_id
    and imports.status in ('failed', 'preparing')
  returning imports.provider, imports.advertiser_id, imports.locale,
    imports.record_count, imports.valid_count, imports.skipped_count;

  if not found then
    raise exception 'Only failed or preparing imports can be resumed';
  end if;
end;
$$;

revoke execute on function public.prepare_affiliate_product_import_chunk(uuid, integer)
from public, anon, authenticated;
revoke execute on function public.activate_prepared_affiliate_product_import(uuid)
from public, anon, authenticated;
revoke execute on function public.cleanup_prepared_affiliate_product_import_chunk(uuid, integer)
from public, anon, authenticated;
revoke execute on function public.resume_affiliate_product_import(uuid)
from public, anon, authenticated;
revoke execute on function public.cleanup_inactive_affiliate_catalog_chunk(uuid, integer)
from public, anon, authenticated;

grant execute on function public.prepare_affiliate_product_import_chunk(uuid, integer)
to service_role;
grant execute on function public.activate_prepared_affiliate_product_import(uuid)
to service_role;
grant execute on function public.cleanup_prepared_affiliate_product_import_chunk(uuid, integer)
to service_role;
grant execute on function public.resume_affiliate_product_import(uuid)
to service_role;
grant execute on function public.cleanup_inactive_affiliate_catalog_chunk(uuid, integer)
to service_role;

-- Facet-first retrieval must resolve only the active snapshot for each scope.
-- Do this inside the bounded query, rather than filtering its result afterward:
-- hidden preparation rows must not consume any per-facet or per-merchant slots.
alter function public.search_awin_catalog_candidates_by_facets(
  text[], text, numeric, numeric, text[], text, integer, integer
) rename to search_awin_catalog_candidates_by_facets_legacy;

create function public.search_awin_catalog_candidates_by_facets(
  p_advertiser_ids text[],
  p_currency text default 'USD',
  p_budget_min numeric default null,
  p_budget_max numeric default null,
  p_facets text[] default '{}',
  p_selection_seed text default '',
  p_per_advertiser_limit integer default 72,
  p_total_limit integer default 288
)
returns table (
  provider text,
  advertiser_id text,
  locale text,
  merchant_name text,
  external_product_id text,
  title text,
  description text,
  image_url text,
  affiliate_url text,
  price numeric,
  currency text,
  availability text,
  active boolean,
  destination_health_status text,
  destination_checked_at timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with bounds as (
    select
      greatest(1, least(coalesce(p_per_advertiser_limit, 72), 72)) as per_advertiser_limit,
      greatest(1, least(coalesce(p_total_limit, 288), 288)) as total_limit,
      12::integer as per_facet_limit,
      12::integer as fallback_limit,
      coalesce(p_selection_seed, '') as selection_seed
  ),
  advertisers as (
    select btrim(advertiser_id) as advertiser_id, min(ordinality) as position
    from unnest(coalesce(p_advertiser_ids, array[]::text[]))
      with ordinality as input_values(advertiser_id, ordinality)
    where char_length(btrim(input_values.advertiser_id)) between 1 and 32
    group by btrim(advertiser_id)
    order by min(ordinality)
    limit 50
  ),
  allowed_facets(facet) as (
    values
      ('personalized'), ('engraved'), ('photo_gift'), ('drinkware'), ('kitchen_tool'),
      ('home_decor'), ('bedding'), ('necklace'), ('bracelet'), ('ring'), ('earrings'),
      ('preserved_rose'), ('bouquet'), ('romantic'), ('pet_grooming'), ('fishing'),
      ('reel'), ('rod'), ('tackle'), ('camping'), ('gardening'), ('reading'), ('music'),
      ('gaming'), ('tech_accessory'), ('apparel'), ('baby'), ('anniversary'),
      ('valentines'), ('wedding'), ('mothers_day'), ('memorial')
  ),
  requested_facets as (
    select btrim(input_values.facet) as facet, min(input_values.ordinality) as facet_priority
    from unnest(coalesce(p_facets, array[]::text[]))
      with ordinality as input_values(facet, ordinality)
    join allowed_facets on allowed_facets.facet = btrim(input_values.facet)
    group by btrim(input_values.facet)
    order by min(input_values.ordinality)
    limit 12
  ),
  retrieval_buckets as (
    select
      step + 1 as bucket_priority,
      mod(
        ((hashtextextended(bounds.selection_seed, 0) & 9223372036854775807)::numeric + step),
        16
      )::smallint as catalog_retrieval_bucket
    from bounds
    cross join generate_series(0, 1) as step
  ),
  facet_candidates as (
    select candidate.*, 0 as source_priority
    from advertisers
    cross join requested_facets
    cross join bounds
    cross join lateral (
      select products.*, requested_facets.facet_priority, retrieval_buckets.bucket_priority
      from retrieval_buckets
      join public.affiliate_product_facets facets
        on facets.advertiser_id = advertisers.advertiser_id
        and facets.facet = requested_facets.facet
        and facets.catalog_retrieval_bucket = retrieval_buckets.catalog_retrieval_bucket
      join public.affiliate_products products on products.id = facets.product_id
      join public.affiliate_product_imports imports
        on imports.id = products.import_batch_id
        and imports.catalog_active = true
      where products.provider = 'awin'
        and products.active = true
        and products.availability = 'in_stock'
        and upper(btrim(p_currency)) = 'USD'
        and products.currency = 'USD'
        and (p_budget_min is null or products.price >= p_budget_min)
        and (p_budget_max is null or products.price <= p_budget_max)
      order by retrieval_buckets.bucket_priority, facets.catalog_retrieval_rank
      limit bounds.per_facet_limit
    ) as candidate
  ),
  fallback_candidates as (
    select candidate.*, 1 as source_priority
    from advertisers
    cross join bounds
    cross join lateral (
      select products.*, 2147483647::bigint as facet_priority, retrieval_buckets.bucket_priority
      from retrieval_buckets
      join public.affiliate_products products
        on products.advertiser_id = advertisers.advertiser_id
        and products.catalog_retrieval_bucket = retrieval_buckets.catalog_retrieval_bucket
      join public.affiliate_product_imports imports
        on imports.id = products.import_batch_id
        and imports.catalog_active = true
      where products.provider = 'awin'
        and products.active = true
        and products.availability = 'in_stock'
        and upper(btrim(p_currency)) = 'USD'
        and products.currency = 'USD'
        and (
          products.classification_version is null
          or products.classification_confidence = 'low'
        )
        and (p_budget_min is null or products.price >= p_budget_min)
        and (p_budget_max is null or products.price <= p_budget_max)
      order by retrieval_buckets.bucket_priority, products.catalog_retrieval_rank
      limit bounds.fallback_limit
    ) as candidate
  ),
  bounded_candidates as (
    select * from facet_candidates
    union all
    select * from fallback_candidates
  ),
  deduplicated as (
    select distinct on (id) *
    from bounded_candidates
    order by id, source_priority, facet_priority, bucket_priority, catalog_retrieval_rank
  ),
  merchant_ranked as (
    select
      deduplicated.*,
      row_number() over (
        partition by advertiser_id
        order by source_priority, facet_priority, bucket_priority, catalog_retrieval_rank
      ) as advertiser_rank
    from deduplicated
  )
  select
    provider, advertiser_id, locale, merchant_name, external_product_id,
    title, description, image_url, affiliate_url, price, currency,
    availability, active, destination_health_status, destination_checked_at
  from merchant_ranked
  cross join bounds
  where advertiser_rank <= bounds.per_advertiser_limit
  order by
    advertiser_rank,
    md5(advertiser_id || ':' || bounds.selection_seed),
    source_priority,
    facet_priority,
    bucket_priority,
    catalog_retrieval_rank
  limit (select total_limit from bounds);
$$;

revoke execute on function public.search_awin_catalog_candidates_by_facets_legacy(
  text[], text, numeric, numeric, text[], text, integer, integer
) from public, anon, authenticated;
grant execute on function public.search_awin_catalog_candidates_by_facets_legacy(
  text[], text, numeric, numeric, text[], text, integer, integer
) to service_role;

revoke execute on function public.finalize_affiliate_product_import(uuid)
from service_role;
