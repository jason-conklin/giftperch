-- Bounded facet-first candidate retrieval for catalog recommendations.
-- This is additive: commercial product fields, product identities, and the
-- existing full-text RPC remain untouched for backwards-compatible rollback.

alter table public.affiliate_products
  add column catalog_retrieval_bucket smallint,
  add column catalog_retrieval_rank bigint;

update public.affiliate_products
set
  catalog_retrieval_bucket = mod(
    (hashtextextended(
      provider || ':' || advertiser_id || ':' || locale || ':' || external_product_id,
      0
    ) & 9223372036854775807)::numeric,
    16
  )::smallint,
  catalog_retrieval_rank = hashtextextended(
    provider || ':' || advertiser_id || ':' || locale || ':' || external_product_id,
    1
  )
where provider = 'awin'
  and (catalog_retrieval_bucket is null or catalog_retrieval_rank is null);

alter table public.affiliate_products
  add constraint affiliate_products_catalog_retrieval_bucket_check
    check (catalog_retrieval_bucket is null or catalog_retrieval_bucket between 0 and 15);

alter table public.affiliate_product_facets
  add column advertiser_id text,
  add column catalog_retrieval_bucket smallint,
  add column catalog_retrieval_rank bigint;

update public.affiliate_product_facets facets
set
  advertiser_id = products.advertiser_id,
  catalog_retrieval_bucket = products.catalog_retrieval_bucket,
  catalog_retrieval_rank = products.catalog_retrieval_rank
from public.affiliate_products products
where products.id = facets.product_id
  and (
    facets.advertiser_id is null
    or facets.catalog_retrieval_bucket is null
    or facets.catalog_retrieval_rank is null
  );

alter table public.affiliate_product_facets
  alter column advertiser_id set not null,
  alter column catalog_retrieval_bucket set not null,
  alter column catalog_retrieval_rank set not null,
  add constraint affiliate_product_facets_catalog_retrieval_bucket_check
    check (catalog_retrieval_bucket between 0 and 15);

-- Product rows can be read through a small, deterministic fallback pool when
-- classification is absent or low confidence. Facet reads use the next index.
create index affiliate_products_awin_facet_fallback_idx
on public.affiliate_products (
  advertiser_id,
  catalog_retrieval_bucket,
  catalog_retrieval_rank,
  price,
  id
)
where provider = 'awin'
  and active = true
  and availability = 'in_stock'
  and currency = 'USD';

create index affiliate_product_facets_candidate_bucket_idx
on public.affiliate_product_facets (
  advertiser_id,
  facet,
  catalog_retrieval_bucket,
  catalog_retrieval_rank,
  product_id
);

create or replace function public.finalize_affiliate_product_import(p_import_id uuid)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  current_import public.affiliate_product_imports%rowtype;
  staged_count integer;
  mismatched_count integer;
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
  if current_import.status <> 'staging' then
    raise exception 'Affiliate product import is not in staging status';
  end if;

  select count(*) into staged_count
  from public.affiliate_product_staging
  where import_id = p_import_id;

  if staged_count = 0 or staged_count <> current_import.valid_count then
    raise exception 'Staged product count does not match validated product count';
  end if;

  select count(*) into mismatched_count
  from public.affiliate_product_staging
  where import_id = p_import_id
    and (
      provider <> current_import.provider
      or advertiser_id <> current_import.advertiser_id
      or locale <> current_import.locale
    );

  if mismatched_count > 0 then
    raise exception 'Staged products do not match the import scope';
  end if;

  select count(*) into active_count
  from public.affiliate_products
  where provider = current_import.provider
    and advertiser_id = current_import.advertiser_id
    and locale = current_import.locale
    and active = true;

  required_count := greatest(
    current_import.minimum_valid_count,
    ceiling(active_count::numeric * 0.8)::integer
  );

  if staged_count < required_count then
    raise exception 'Staged product count % is below required count %',
      staged_count, required_count;
  end if;

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
  from public.affiliate_product_staging
  where import_id = p_import_id
  on conflict (provider, advertiser_id, locale, external_product_id)
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
    import_batch_id = excluded.import_batch_id,
    imported_at = excluded.imported_at,
    updated_at = excluded.updated_at,
    source_category = excluded.source_category,
    classification_primary_category = excluded.classification_primary_category,
    classification_version = excluded.classification_version,
    classification_confidence = excluded.classification_confidence,
    classification_evidence = excluded.classification_evidence,
    catalog_retrieval_bucket = excluded.catalog_retrieval_bucket,
    catalog_retrieval_rank = excluded.catalog_retrieval_rank;

  delete from public.affiliate_product_facets facets
  using public.affiliate_products products
  join public.affiliate_product_staging staged
    on products.provider = staged.provider
    and products.advertiser_id = staged.advertiser_id
    and products.locale = staged.locale
    and products.external_product_id = staged.external_product_id
  where staged.import_id = p_import_id
    and staged.classification_version is not null
    and facets.product_id = products.id;

  insert into public.affiliate_product_facets (
    product_id, facet, classification_version, advertiser_id,
    catalog_retrieval_bucket, catalog_retrieval_rank
  )
  select
    products.id, facet, staged.classification_version, products.advertiser_id,
    products.catalog_retrieval_bucket, products.catalog_retrieval_rank
  from public.affiliate_product_staging staged
  join public.affiliate_products products
    on products.provider = staged.provider
    and products.advertiser_id = staged.advertiser_id
    and products.locale = staged.locale
    and products.external_product_id = staged.external_product_id
  cross join lateral unnest(staged.classification_facets) as facet
  where staged.import_id = p_import_id
    and staged.classification_version is not null
  on conflict (product_id, facet)
  do update set
    classification_version = excluded.classification_version,
    advertiser_id = excluded.advertiser_id,
    catalog_retrieval_bucket = excluded.catalog_retrieval_bucket,
    catalog_retrieval_rank = excluded.catalog_retrieval_rank;

  update public.affiliate_products
  set active = false, updated_at = timezone('utc', now())
  where provider = current_import.provider
    and advertiser_id = current_import.advertiser_id
    and locale = current_import.locale
    and import_batch_id <> p_import_id
    and active = true;

  update public.affiliate_product_imports
  set status = 'completed', completed_at = timezone('utc', now()), error_message = null
  where id = p_import_id;

  delete from public.affiliate_product_staging where import_id = p_import_id;
  return staged_count;
end;
$$;

create or replace function public.replace_affiliate_product_classification(
  p_product_id uuid,
  p_source_category text,
  p_primary_category text,
  p_classification_version integer,
  p_confidence text,
  p_evidence jsonb,
  p_facets text[]
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  product_scope record;
begin
  if p_primary_category not in (
    'personalized_gifts', 'home_kitchen', 'jewelry_accessories',
    'flowers_romantic', 'pets', 'sports_outdoors',
    'hobbies_entertainment', 'tech_gadgets', 'beauty_wellness',
    'clothing_accessories', 'kids_baby', 'other'
  ) then
    raise exception 'Invalid affiliate product primary category';
  end if;
  if p_classification_version <= 0 then
    raise exception 'Classification version must be positive';
  end if;
  if p_confidence not in ('high', 'medium', 'low') then
    raise exception 'Invalid affiliate product classification confidence';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_facets, '{}'::text[])) as value
    where value not in (
      'personalized', 'engraved', 'photo_gift', 'drinkware', 'kitchen_tool',
      'home_decor', 'bedding', 'necklace', 'bracelet', 'ring', 'earrings',
      'preserved_rose', 'bouquet', 'romantic', 'pet_grooming', 'fishing',
      'reel', 'rod', 'tackle', 'camping', 'gardening', 'reading', 'music',
      'gaming', 'tech_accessory', 'apparel', 'baby', 'anniversary',
      'valentines', 'wedding', 'mothers_day', 'memorial'
    )
  ) then
    raise exception 'Invalid affiliate product classification facet';
  end if;

  update public.affiliate_products
  set
    source_category = p_source_category,
    classification_primary_category = p_primary_category,
    classification_version = p_classification_version,
    classification_confidence = p_confidence,
    classification_evidence = coalesce(p_evidence, '[]'::jsonb),
    updated_at = timezone('utc', now())
  where id = p_product_id
  returning advertiser_id, catalog_retrieval_bucket, catalog_retrieval_rank
  into product_scope;

  if not found then
    raise exception 'Affiliate product not found';
  end if;

  delete from public.affiliate_product_facets where product_id = p_product_id;
  insert into public.affiliate_product_facets (
    product_id, facet, classification_version, advertiser_id,
    catalog_retrieval_bucket, catalog_retrieval_rank
  )
  select
    p_product_id, facet, p_classification_version, product_scope.advertiser_id,
    product_scope.catalog_retrieval_bucket, product_scope.catalog_retrieval_rank
  from unnest(coalesce(p_facets, '{}'::text[])) as facet
  on conflict (product_id, facet)
  do update set
    classification_version = excluded.classification_version,
    advertiser_id = excluded.advertiser_id,
    catalog_retrieval_bucket = excluded.catalog_retrieval_bucket,
    catalog_retrieval_rank = excluded.catalog_retrieval_rank;
end;
$$;

create or replace function public.search_awin_catalog_candidates_by_facets(
  p_advertiser_ids text[],
  p_currency text,
  p_budget_min numeric,
  p_budget_max numeric,
  p_facets text[],
  p_selection_seed text,
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
    group by btrim(input_values.advertiser_id)
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
      select
        products.*,
        requested_facets.facet_priority,
        retrieval_buckets.bucket_priority
      from retrieval_buckets
      join public.affiliate_product_facets facets
        on facets.advertiser_id = advertisers.advertiser_id
        and facets.facet = requested_facets.facet
        and facets.catalog_retrieval_bucket = retrieval_buckets.catalog_retrieval_bucket
      join public.affiliate_products products on products.id = facets.product_id
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
      select
        products.*,
        2147483647::bigint as facet_priority,
        retrieval_buckets.bucket_priority
      from retrieval_buckets
      join public.affiliate_products products
        on products.advertiser_id = advertisers.advertiser_id
        and products.catalog_retrieval_bucket = retrieval_buckets.catalog_retrieval_bucket
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
    select distinct on (id)
      *
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
    provider,
    advertiser_id,
    locale,
    merchant_name,
    external_product_id,
    title,
    description,
    image_url,
    affiliate_url,
    price,
    currency,
    availability,
    active,
    destination_health_status,
    destination_checked_at
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

revoke execute on function public.search_awin_catalog_candidates_by_facets(
  text[], text, numeric, numeric, text[], text, integer, integer
) from public, anon, authenticated;
grant execute on function public.search_awin_catalog_candidates_by_facets(
  text[], text, numeric, numeric, text[], text, integer, integer
) to service_role;
