-- Ensure budget columns exist on recipient_profiles
alter table public.recipient_profiles
  add column if not exists budget_per_gift numeric;

alter table public.recipient_profiles
  add column if not exists budget_annual numeric;
