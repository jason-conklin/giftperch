-- Adds focused retrieval facets for cycling equipment and model-display
-- accessories. Existing products and commercial fields are unchanged.

alter table public.affiliate_product_facets
  drop constraint if exists affiliate_product_facets_facet_check;

alter table public.affiliate_product_facets
  add constraint affiliate_product_facets_facet_check
  check (
    facet in (
      'personalized', 'engraved', 'photo_gift', 'drinkware', 'kitchen_tool',
      'home_decor', 'bedding', 'necklace', 'bracelet', 'ring', 'earrings',
      'preserved_rose', 'bouquet', 'romantic', 'pet_grooming', 'fishing',
      'reel', 'rod', 'tackle', 'camping', 'gardening', 'reading', 'music',
      'gaming', 'tech_accessory', 'apparel', 'baby', 'anniversary',
      'valentines', 'wedding', 'mothers_day', 'memorial', 'cycling',
      'model_building', 'display_accessory'
    )
  );

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
      'valentines', 'wedding', 'mothers_day', 'memorial', 'cycling',
      'model_building', 'display_accessory'
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
    product_id, facet, classification_version, advertiser_id,
    catalog_retrieval_bucket, catalog_retrieval_rank
  )
  select
    products.id, facet, p_classification_version, products.advertiser_id,
    products.catalog_retrieval_bucket, products.catalog_retrieval_rank
  from public.affiliate_products products
  cross join lateral unnest(coalesce(p_facets, '{}'::text[])) as facet
  where products.id = p_product_id
  on conflict (product_id, facet)
  do update set
    classification_version = excluded.classification_version,
    advertiser_id = excluded.advertiser_id,
    catalog_retrieval_bucket = excluded.catalog_retrieval_bucket,
    catalog_retrieval_rank = excluded.catalog_retrieval_rank;
end;
$$;

revoke execute on function public.replace_affiliate_product_classification(
  uuid, text, text, integer, text, jsonb, text[]
) from public, anon, authenticated;
grant execute on function public.replace_affiliate_product_classification(
  uuid, text, text, integer, text, jsonb, text[]
) to service_role;

-- The deployed RPC has parameter defaults that PostgreSQL will not reliably
-- replace in place. The migration remains transactional: if recreation or a
-- dependent object fails, the existing function is retained unchanged.
drop function public.search_awin_catalog_candidates_by_facets(
  text[], text, numeric, numeric, text[], text, integer, integer
);

create function public.search_awin_catalog_candidates_by_facets(
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
      ('valentines'), ('wedding'), ('mothers_day'), ('memorial'), ('cycling'),
      ('model_building'), ('display_accessory')
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
