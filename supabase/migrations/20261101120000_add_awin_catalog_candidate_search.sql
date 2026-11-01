-- Bounded, relevance-ranked candidate retrieval for catalog-first recommendations.
-- The function is service-role only; application policy and product validation stay in TypeScript.

create index affiliate_products_awin_candidate_search_idx
on public.affiliate_products using gin (
  to_tsvector('english', title || ' ' || coalesce(description, ''))
)
where provider = 'awin'
  and active = true
  and availability = 'in_stock'
  and currency = 'USD';

create index affiliate_products_awin_candidate_filter_idx
on public.affiliate_products (advertiser_id, price, external_product_id)
where provider = 'awin'
  and active = true
  and availability = 'in_stock'
  and currency = 'USD';

create or replace function public.search_awin_catalog_candidates(
  p_advertiser_ids text[],
  p_currency text,
  p_budget_min numeric,
  p_budget_max numeric,
  p_search_terms text[],
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
  with raw_terms as (
    select btrim(term) as term, ordinality
    from unnest(coalesce(p_search_terms, array[]::text[]))
      with ordinality as terms(term, ordinality)
    where char_length(btrim(term)) between 3 and 240
  ),
  normalized_terms as (
    select websearch_to_tsquery('english', term) as query
    from (
      select term, min(ordinality) as first_position
      from raw_terms
      group by term
      order by first_position asc
      limit 12
    ) as bounded_terms
  ),
  matched as (
    select
      p.*,
      max(
        ts_rank_cd(
          to_tsvector('english', p.title || ' ' || coalesce(p.description, '')),
          normalized_terms.query
        )
      ) as search_rank
    from public.affiliate_products p
    join normalized_terms
      on to_tsvector('english', p.title || ' ' || coalesce(p.description, ''))
         @@ normalized_terms.query
    where p.provider = 'awin'
      and p.active = true
      and p.availability = 'in_stock'
      -- Catalog-first recommendations are USD-only. Keeping this predicate
      -- literal lets PostgreSQL use the matching partial indexes above.
      and upper(btrim(p_currency)) = 'USD'
      and p.currency = 'USD'
      and p.advertiser_id = any(p_advertiser_ids)
      and (p_budget_min is null or p.price >= p_budget_min)
      and (p_budget_max is null or p.price <= p_budget_max)
    group by p.id
  ),
  balanced as (
    select
      matched.*,
      row_number() over (
        partition by advertiser_id
        order by search_rank desc, title asc, external_product_id asc
      ) as advertiser_rank
    from matched
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
  from balanced
  where advertiser_rank <= greatest(1, least(p_per_advertiser_limit, 72))
  -- The hash gives the final partial merchant tier a stable, query-specific
  -- tie-breaker instead of favoring lexically earlier advertiser IDs.
  order by
    advertiser_rank asc,
    search_rank desc,
    md5(advertiser_id || ':' || array_to_string(p_search_terms, '|')) asc,
    title asc,
    external_product_id asc
  limit greatest(1, least(p_total_limit, 288));
$$;

revoke execute on function public.search_awin_catalog_candidates(
  text[], text, numeric, numeric, text[], integer, integer
) from public, anon, authenticated;
grant execute on function public.search_awin_catalog_candidates(
  text[], text, numeric, numeric, text[], integer, integer
) to service_role;
