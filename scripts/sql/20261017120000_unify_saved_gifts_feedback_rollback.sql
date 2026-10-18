begin;

insert into public.recipient_gift_feedback (
  id,
  user_id,
  recipient_id,
  suggestion_id,
  suggestion_index,
  preference,
  created_at
)
select
  archive.feedback_id,
  archive.user_id,
  archive.recipient_id,
  archive.suggestion_id,
  archive.suggestion_index,
  archive.preference,
  archive.feedback_created_at
from public.recipient_gift_feedback_archive as archive
where exists (
  select 1
  from public.gift_suggestions as run
  where run.id = archive.suggestion_id
    and run.user_id = archive.user_id
    and run.recipient_id = archive.recipient_id
)
on conflict do nothing;

delete from public.recipient_saved_gift_ideas as saved
using public.recipient_gift_feedback_archive as archive
where saved.source_feedback_id = archive.feedback_id
  and archive.conversion_status = 'converted';

commit;
