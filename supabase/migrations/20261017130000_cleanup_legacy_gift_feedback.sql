begin;

lock table public.recipient_saved_gift_ideas in share row exclusive mode;
lock table public.recipient_gift_feedback in share row exclusive mode;
lock table public.recipient_gift_feedback_archive in share row exclusive mode;

do $$
begin
  if exists (
    select 1
    from public.recipient_gift_feedback as feedback
    left join public.recipient_gift_feedback_archive as archive
      on archive.feedback_id = feedback.id
    where archive.feedback_id is null
      or archive.conversion_status in ('pending', 'unconvertible')
  ) then
    raise exception
      'Legacy feedback cleanup aborted: source rows are not fully archived and reconciled';
  end if;

  if exists (
    select 1
    from public.recipient_gift_feedback_archive as archive
    left join public.recipient_saved_gift_ideas as saved
      on saved.id = archive.saved_gift_id
    where archive.conversion_status = 'converted'
      and (
        saved.id is null
        or saved.source_feedback_id <> archive.feedback_id
      )
  ) then
    raise exception
      'Legacy feedback cleanup aborted: a converted saved gift is missing';
  end if;
end
$$;

delete from public.recipient_gift_feedback as feedback
using public.recipient_gift_feedback_archive as archive
where feedback.id = archive.feedback_id
  and archive.conversion_status in ('converted', 'duplicate', 'discarded');

do $$
begin
  if exists (select 1 from public.recipient_gift_feedback) then
    raise exception
      'Legacy feedback cleanup aborted: feedback rows remain after cleanup';
  end if;
end
$$;

commit;
