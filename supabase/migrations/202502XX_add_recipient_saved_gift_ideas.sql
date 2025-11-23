-- Create table for per-recipient saved gift ideas
create table if not exists public.recipient_saved_gift_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references public.recipient_profiles(id) on delete cascade,
  suggestion_id uuid references public.gift_suggestions(id) on delete set null,
  title text not null,
  tier text,
  rationale text,
  estimated_price_min numeric,
  estimated_price_max numeric,
  product_url text,
  image_url text,
  created_at timestamptz not null default now()
);

-- Enable row level security
alter table public.recipient_saved_gift_ideas enable row level security;

-- Policies
create policy "Select own saved gift ideas"
on public.recipient_saved_gift_ideas
for select
to authenticated
using (user_id = auth.uid());

create policy "Insert own saved gift ideas"
on public.recipient_saved_gift_ideas
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Update own saved gift ideas"
on public.recipient_saved_gift_ideas
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Delete own saved gift ideas"
on public.recipient_saved_gift_ideas
for delete
to authenticated
using (user_id = auth.uid());
