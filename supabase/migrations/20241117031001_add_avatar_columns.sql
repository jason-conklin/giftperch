alter table public.profiles
  add column if not exists avatar_url text;

alter table public.recipient_profiles
  add column if not exists avatar_url text;
