-- Additional schema for guides and user-level settings
set check_function_bodies = off;

create table public.gift_guides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'draft',
  tags text[],
  is_featured boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  send_weekly_digest boolean not null default true,
  send_occasion_reminders boolean not null default true,
  send_affiliate_reports boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- indexes
create index idx_gift_guides_user_id on public.gift_guides(user_id);

-- triggers
create trigger set_gift_guides_updated_at
  before update on public.gift_guides
  for each row
  execute function public.set_updated_at();

create trigger set_user_settings_updated_at
  before update on public.user_settings
  for each row
  execute function public.set_updated_at();

-- Row Level Security
alter table public.gift_guides enable row level security;
alter table public.user_settings enable row level security;

create policy "Users manage their gift guides"
on public.gift_guides
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users manage their settings"
on public.user_settings
using (user_id = auth.uid())
with check (user_id = auth.uid());
