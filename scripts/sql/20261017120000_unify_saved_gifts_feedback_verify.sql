select
  count(*) as current_saved_gifts,
  count(*) filter (where source_feedback_id is not null) as converted_saved_gifts,
  count(*) - count(*) filter (where source_feedback_id is not null)
    as pre_migration_saved_gifts
from public.recipient_saved_gift_ideas;

select
  preference,
  conversion_status,
  count(*) as record_count
from public.recipient_gift_feedback_archive
group by preference, conversion_status
order by preference, conversion_status;

select
  (select count(*) from public.recipient_gift_feedback) as remaining_feedback,
  count(*) filter (where conversion_status = 'pending') as pending_archive_rows,
  count(*) filter (where conversion_status = 'unconvertible')
    as unconvertible_archive_rows,
  count(*) filter (
    where conversion_status = 'converted'
      and saved_gift_id is null
  ) as converted_rows_without_saved_gift
from public.recipient_gift_feedback_archive;

select count(*) as converted_rows_missing_saved_gifts
from public.recipient_gift_feedback_archive as archive
left join public.recipient_saved_gift_ideas as saved
  on saved.id = archive.saved_gift_id
where archive.conversion_status = 'converted'
  and (
    saved.id is null
    or saved.source_feedback_id <> archive.feedback_id
  );
