alter table public.affiliate_products
  add column destination_health_status text not null default 'unchecked'
    check (destination_health_status in ('unchecked', 'valid', 'invalid', 'uncertain')),
  add column destination_health_reason text,
  add column destination_checked_at timestamptz,
  add column destination_final_url text,
  add column destination_http_status integer
    check (destination_http_status is null or destination_http_status between 100 and 599);

create index affiliate_products_destination_health_idx
on public.affiliate_products(provider, advertiser_id, active, destination_health_status);

create or replace function public.reset_affiliate_product_destination_health()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.destination_url is distinct from old.destination_url
    or new.affiliate_url is distinct from old.affiliate_url then
    new.destination_health_status := 'unchecked';
    new.destination_health_reason := null;
    new.destination_checked_at := null;
    new.destination_final_url := null;
    new.destination_http_status := null;
  end if;
  return new;
end;
$$;

create trigger affiliate_products_reset_destination_health
before update of destination_url, affiliate_url on public.affiliate_products
for each row execute function public.reset_affiliate_product_destination_health();

revoke execute on function public.reset_affiliate_product_destination_health()
from public, anon, authenticated;
grant execute on function public.reset_affiliate_product_destination_health()
to service_role;
