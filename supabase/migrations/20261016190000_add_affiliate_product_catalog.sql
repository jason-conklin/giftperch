create table public.affiliate_product_imports (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  publisher_id text not null,
  advertiser_id text not null,
  locale text not null,
  minimum_valid_count integer not null check (minimum_valid_count > 0),
  status text not null check (status in ('staging', 'completed', 'failed')),
  record_count integer not null default 0 check (record_count >= 0),
  valid_count integer not null default 0 check (valid_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  error_message text,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create unique index affiliate_product_imports_one_staging_feed
on public.affiliate_product_imports(provider, advertiser_id, locale)
where status = 'staging';

create table public.affiliate_product_staging (
  import_id uuid not null references public.affiliate_product_imports(id) on delete cascade,
  provider text not null,
  advertiser_id text not null,
  merchant_name text not null,
  external_product_id text not null,
  locale text not null,
  title text not null,
  description text,
  image_url text not null,
  destination_url text not null,
  affiliate_url text not null,
  price numeric(12, 2) not null check (price >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  availability text not null,
  imported_at timestamptz not null,
  primary key (import_id, external_product_id)
);

create table public.affiliate_products (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  advertiser_id text not null,
  merchant_name text not null,
  external_product_id text not null,
  locale text not null,
  title text not null,
  description text,
  image_url text not null,
  destination_url text not null,
  affiliate_url text not null,
  price numeric(12, 2) not null check (price >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  availability text not null,
  active boolean not null default true,
  import_batch_id uuid not null references public.affiliate_product_imports(id),
  imported_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (provider, advertiser_id, locale, external_product_id)
);

create index affiliate_products_active_feed_idx
on public.affiliate_products(provider, advertiser_id, locale, active);

create index affiliate_products_active_price_idx
on public.affiliate_products(active, currency, price);

create index affiliate_products_search_idx
on public.affiliate_products using gin (
  to_tsvector('english', title || ' ' || coalesce(description, ''))
);

alter table public.affiliate_product_imports enable row level security;
alter table public.affiliate_product_staging enable row level security;
alter table public.affiliate_products enable row level security;

revoke all on public.affiliate_product_imports from public, anon, authenticated;
revoke all on public.affiliate_product_staging from public, anon, authenticated;
revoke all on public.affiliate_products from public, anon, authenticated;

grant select, insert, update, delete on public.affiliate_product_imports to service_role;
grant select, insert, update, delete on public.affiliate_product_staging to service_role;
grant select, insert, update, delete on public.affiliate_products to service_role;

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
    provider,
    advertiser_id,
    merchant_name,
    external_product_id,
    locale,
    title,
    description,
    image_url,
    destination_url,
    affiliate_url,
    price,
    currency,
    availability,
    active,
    import_batch_id,
    imported_at,
    updated_at
  )
  select
    provider,
    advertiser_id,
    merchant_name,
    external_product_id,
    locale,
    title,
    description,
    image_url,
    destination_url,
    affiliate_url,
    price,
    currency,
    availability,
    true,
    p_import_id,
    imported_at,
    timezone('utc', now())
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
    updated_at = excluded.updated_at;

  update public.affiliate_products
  set
    active = false,
    updated_at = timezone('utc', now())
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
