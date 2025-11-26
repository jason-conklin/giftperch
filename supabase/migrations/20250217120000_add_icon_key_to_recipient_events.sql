-- Add optional icon key to recipient_events for custom occasion icons
alter table public.recipient_events
  add column if not exists icon_key text;
