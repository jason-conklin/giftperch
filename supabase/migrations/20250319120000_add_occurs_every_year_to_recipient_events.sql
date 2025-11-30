-- Allow custom occasions to repeat annually without duplicating records
alter table public.recipient_events
  add column if not exists occurs_every_year boolean not null default false;
