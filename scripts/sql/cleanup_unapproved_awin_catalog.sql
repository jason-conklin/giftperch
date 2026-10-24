-- Production cleanup plan. DO NOT RUN until the deletion preview has been
-- reviewed and explicitly approved. It affects only Awin catalog tables.
--
-- Observed from the read-only audit on 2026-10-24:
--   * 6,553 unapproved affiliate_products rows
--   * 11 unapproved affiliate_product_imports rows
--   * 0 unapproved affiliate_product_staging rows
--   * 1,010 approved Awin product rows retained
--
-- Before executing, export the SELECT previews below from the Supabase SQL
-- editor or a trusted administrative backup workflow. This script aborts if
-- the observed counts have changed, rather than deleting a changed catalog.

begin;

create temporary table approved_awin_advertisers (
  advertiser_id text primary key
) on commit drop;

insert into approved_awin_advertisers (advertiser_id) values
  ('100833'), ('126623'), ('90759'), ('117209'), ('130667'), ('57823'),
  ('111366'), ('127139'), ('82455'), ('120101'), ('89509'), ('130555'),
  ('125856'), ('95201'), ('131404'), ('129093'), ('78182'), ('129497');

-- Backup/export preview. Do not remove before taking an external export.
select advertiser_id, locale, count(*) as product_count
from public.affiliate_products
where provider = 'awin'
  and advertiser_id not in (select advertiser_id from approved_awin_advertisers)
group by advertiser_id, locale
order by advertiser_id, locale;

select advertiser_id, locale, status, count(*) as import_count
from public.affiliate_product_imports
where provider = 'awin'
  and advertiser_id not in (select advertiser_id from approved_awin_advertisers)
group by advertiser_id, locale, status
order by advertiser_id, locale, status;

do $$
declare
  target_product_count integer;
  target_import_count integer;
  target_staging_count integer;
  approved_product_count integer;
begin
  select count(*) into target_product_count
  from public.affiliate_products
  where provider = 'awin'
    and advertiser_id not in (select advertiser_id from approved_awin_advertisers);

  select count(*) into target_import_count
  from public.affiliate_product_imports
  where provider = 'awin'
    and advertiser_id not in (select advertiser_id from approved_awin_advertisers);

  select count(*) into target_staging_count
  from public.affiliate_product_staging
  where provider = 'awin'
    and advertiser_id not in (select advertiser_id from approved_awin_advertisers);

  select count(*) into approved_product_count
  from public.affiliate_products
  where provider = 'awin'
    and advertiser_id in (select advertiser_id from approved_awin_advertisers);

  if target_product_count <> 6553 then
    raise exception 'Refusing cleanup: expected 6553 unapproved products, found %', target_product_count;
  end if;
  if target_import_count <> 11 then
    raise exception 'Refusing cleanup: expected 11 unapproved imports, found %', target_import_count;
  end if;
  if target_staging_count <> 0 then
    raise exception 'Refusing cleanup: expected no unapproved staging rows, found %', target_staging_count;
  end if;
  if approved_product_count <> 1010 then
    raise exception 'Refusing cleanup: expected 1010 approved products, found %', approved_product_count;
  end if;
end $$;

-- affiliate_products references imports, so delete catalog rows before their
-- associated import history. No application user tables are targeted.
delete from public.affiliate_products
where provider = 'awin'
  and advertiser_id not in (select advertiser_id from approved_awin_advertisers);

delete from public.affiliate_product_imports
where provider = 'awin'
  and advertiser_id not in (select advertiser_id from approved_awin_advertisers);

do $$
declare
  remaining_unapproved_products integer;
  remaining_unapproved_imports integer;
  remaining_approved_products integer;
begin
  select count(*) into remaining_unapproved_products
  from public.affiliate_products
  where provider = 'awin'
    and advertiser_id not in (select advertiser_id from approved_awin_advertisers);

  select count(*) into remaining_unapproved_imports
  from public.affiliate_product_imports
  where provider = 'awin'
    and advertiser_id not in (select advertiser_id from approved_awin_advertisers);

  select count(*) into remaining_approved_products
  from public.affiliate_products
  where provider = 'awin'
    and advertiser_id in (select advertiser_id from approved_awin_advertisers);

  if remaining_unapproved_products <> 0 or remaining_unapproved_imports <> 0 then
    raise exception 'Cleanup verification failed: % products and % imports remain', remaining_unapproved_products, remaining_unapproved_imports;
  end if;
  if remaining_approved_products <> 1010 then
    raise exception 'Cleanup verification failed: approved product count changed to %', remaining_approved_products;
  end if;
end $$;

commit;
