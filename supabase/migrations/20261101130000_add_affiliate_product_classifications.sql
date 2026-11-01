-- Persistent, deterministic classification metadata for Awin catalog products.
-- This migration does not classify existing rows; use the explicit backfill tool
-- after reviewing the rollout.

alter table public.affiliate_product_staging
  add column source_category text,
  add column classification_primary_category text,
  add column classification_version integer,
  add column classification_confidence text,
  add column classification_evidence jsonb,
  add column classification_facets text[] not null default '{}';

alter table public.affiliate_products
  add column source_category text,
  add column classification_primary_category text,
  add column classification_version integer,
  add column classification_confidence text,
  add column classification_evidence jsonb;

alter table public.affiliate_product_staging
  add constraint affiliate_product_staging_classification_category_check
    check (
      classification_primary_category is null
      or classification_primary_category in (
        'personalized_gifts', 'home_kitchen', 'jewelry_accessories',
        'flowers_romantic', 'pets', 'sports_outdoors',
        'hobbies_entertainment', 'tech_gadgets', 'beauty_wellness',
        'clothing_accessories', 'kids_baby', 'other'
      )
    ),
  add constraint affiliate_product_staging_classification_version_check
    check (classification_version is null or classification_version > 0),
  add constraint affiliate_product_staging_classification_confidence_check
    check (
      classification_confidence is null
      or classification_confidence in ('high', 'medium', 'low')
    );

alter table public.affiliate_products
  add constraint affiliate_products_classification_category_check
    check (
      classification_primary_category is null
      or classification_primary_category in (
        'personalized_gifts', 'home_kitchen', 'jewelry_accessories',
        'flowers_romantic', 'pets', 'sports_outdoors',
        'hobbies_entertainment', 'tech_gadgets', 'beauty_wellness',
        'clothing_accessories', 'kids_baby', 'other'
      )
    ),
  add constraint affiliate_products_classification_version_check
    check (classification_version is null or classification_version > 0),
  add constraint affiliate_products_classification_confidence_check
    check (
      classification_confidence is null
      or classification_confidence in ('high', 'medium', 'low')
    );

create table public.affiliate_product_facets (
  product_id uuid not null references public.affiliate_products(id) on delete cascade,
  facet text not null check (
    facet in (
      'personalized', 'engraved', 'photo_gift', 'drinkware', 'kitchen_tool',
      'home_decor', 'bedding', 'necklace', 'bracelet', 'ring', 'earrings',
      'preserved_rose', 'bouquet', 'romantic', 'pet_grooming', 'fishing',
      'reel', 'rod', 'tackle', 'camping', 'gardening', 'reading', 'music',
      'gaming', 'tech_accessory', 'apparel', 'baby', 'anniversary',
      'valentines', 'wedding', 'mothers_day', 'memorial'
    )
  ),
  classification_version integer not null check (classification_version > 0),
  primary key (product_id, facet)
);

-- Supports future facet-first candidate retrieval. The product primary key
-- covers product-to-facet lookups and this index covers facet-to-product lookups.
create index affiliate_product_facets_facet_product_idx
on public.affiliate_product_facets(facet, product_id);

alter table public.affiliate_product_facets enable row level security;
revoke all on public.affiliate_product_facets from public, anon, authenticated;
grant select, insert, update, delete on public.affiliate_product_facets to service_role;

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
    classification_confidence, classification_evidence
  )
  select
    provider, advertiser_id, merchant_name, external_product_id, locale,
    title, description, image_url, destination_url, affiliate_url, price,
    currency, availability, true, p_import_id, imported_at, timezone('utc', now()),
    source_category, classification_primary_category, classification_version,
    classification_confidence, classification_evidence
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
    classification_evidence = excluded.classification_evidence;

  -- Classifications are replaced only for products staged with a complete
  -- classifier result, preserving compatibility with historical staged imports.
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
    product_id, facet, classification_version
  )
  select products.id, facet, staged.classification_version
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
  do update set classification_version = excluded.classification_version;

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

revoke execute on function public.finalize_affiliate_product_import(uuid)
from public, anon, authenticated;
grant execute on function public.finalize_affiliate_product_import(uuid)
to service_role;

-- The backfill uses this atomic service-role function so an interruption cannot
-- leave product metadata and its normalized facets out of sync.
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
  where id = p_product_id;

  if not found then
    raise exception 'Affiliate product not found';
  end if;

  delete from public.affiliate_product_facets where product_id = p_product_id;
  insert into public.affiliate_product_facets (
    product_id, facet, classification_version
  )
  select p_product_id, facet, p_classification_version
  from unnest(coalesce(p_facets, '{}'::text[])) as facet
  on conflict (product_id, facet)
  do update set classification_version = excluded.classification_version;
end;
$$;

revoke execute on function public.replace_affiliate_product_classification(
  uuid, text, text, integer, text, jsonb, text[]
) from public, anon, authenticated;
grant execute on function public.replace_affiliate_product_classification(
  uuid, text, text, integer, text, jsonb, text[]
) to service_role;
