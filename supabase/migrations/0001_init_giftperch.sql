-- GiftPerch initial schema, policies, and helpers
set check_function_bodies = off;

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql security definer;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.recipient_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relationship text,
  age_hint text,
  gender_hint text,
  notes text,
  budget_annual numeric,
  budget_per_gift numeric,
  birthday date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.recipient_interests (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.recipient_profiles(id) on delete cascade,
  label text not null,
  category text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.recipient_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.recipient_profiles(id) on delete cascade,
  event_type text,
  label text,
  event_date date,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  is_public boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  title text not null,
  url text,
  image_url text,
  price_estimate numeric,
  notes text,
  priority integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.gift_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references public.recipient_profiles(id) on delete cascade,
  title text not null,
  url text,
  image_url text,
  price numeric,
  purchased_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.gift_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references public.recipient_profiles(id) on delete cascade,
  model text,
  prompt_context jsonb,
  suggestions jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  recipient_id uuid references public.recipient_profiles(id) on delete set null,
  suggestion_id uuid references public.gift_suggestions(id) on delete set null,
  product_url text not null,
  clicked_at timestamptz not null default timezone('utc', now()),
  referrer text,
  affiliate_program text
);

create table public.ai_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  recipient_id uuid references public.recipient_profiles(id) on delete set null,
  role text,
  message text,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- indexes
create index idx_recipient_profiles_user_id on public.recipient_profiles(user_id);
create index idx_recipient_interests_recipient_id on public.recipient_interests(recipient_id);
create index idx_recipient_events_recipient_id on public.recipient_events(recipient_id);
create index idx_wishlists_user_id on public.wishlists(user_id);
create index idx_wishlist_items_wishlist_id on public.wishlist_items(wishlist_id);
create index idx_gift_history_user_id on public.gift_history(user_id);
create index idx_gift_history_recipient_id on public.gift_history(recipient_id);
create index idx_gift_suggestions_user_id on public.gift_suggestions(user_id);
create index idx_gift_suggestions_recipient_id on public.gift_suggestions(recipient_id);
create index idx_affiliate_clicks_user_id on public.affiliate_clicks(user_id);
create index idx_affiliate_clicks_suggestion_id on public.affiliate_clicks(suggestion_id);
create index idx_ai_interactions_user_id on public.ai_interactions(user_id);
create index idx_ai_interactions_recipient_id on public.ai_interactions(recipient_id);

-- updated_at triggers
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create trigger set_recipient_profiles_updated_at
  before update on public.recipient_profiles
  for each row
  execute function public.set_updated_at();

create trigger set_wishlists_updated_at
  before update on public.wishlists
  for each row
  execute function public.set_updated_at();

create trigger set_wishlist_items_updated_at
  before update on public.wishlist_items
  for each row
  execute function public.set_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.recipient_profiles enable row level security;
alter table public.recipient_interests enable row level security;
alter table public.recipient_events enable row level security;
alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.gift_history enable row level security;
alter table public.gift_suggestions enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.ai_interactions enable row level security;

create policy "Users can manage their own profiles"
on public.profiles
using (id = auth.uid())
with check (id = auth.uid());

create policy "Users can manage their own recipient profiles"
on public.recipient_profiles
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can manage their recipient interests"
on public.recipient_interests
using (
  exists (
    select 1
    from public.recipient_profiles rp
    where rp.id = recipient_interests.recipient_id
      and rp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.recipient_profiles rp
    where rp.id = recipient_interests.recipient_id
      and rp.user_id = auth.uid()
  )
);

create policy "Users can manage their recipient events"
on public.recipient_events
using (
  exists (
    select 1
    from public.recipient_profiles rp
    where rp.id = recipient_events.recipient_id
      and rp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.recipient_profiles rp
    where rp.id = recipient_events.recipient_id
      and rp.user_id = auth.uid()
  )
);

create policy "Users can manage their own wishlists"
on public.wishlists
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can manage their wishlist items"
on public.wishlist_items
using (
  exists (
    select 1
    from public.wishlists w
    where w.id = wishlist_items.wishlist_id
      and w.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.wishlists w
    where w.id = wishlist_items.wishlist_id
      and w.user_id = auth.uid()
  )
);

create policy "Users can manage their gift history"
on public.gift_history
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can manage their gift suggestions"
on public.gift_suggestions
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can manage their affiliate clicks"
on public.affiliate_clicks
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can manage their AI interactions"
on public.ai_interactions
using (user_id = auth.uid())
with check (user_id = auth.uid());
