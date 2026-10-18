begin;

lock table public.recipient_saved_gift_ideas in share row exclusive mode;
lock table public.recipient_gift_feedback in share row exclusive mode;

do $$
begin
  if exists (
    select 1
    from public.recipient_saved_gift_ideas
    where product_match is null
    group by
      user_id,
      recipient_id,
      lower(btrim(regexp_replace(title, '[^[:alnum:]]+', ' ', 'g')))
    having count(*) > 1
  ) then
    raise exception
      'Cannot unify saved gifts: existing title-only duplicates require review';
  end if;

  if exists (
    select 1
    from public.recipient_saved_gift_ideas
    where product_match is not null
    group by
      user_id,
      recipient_id,
      product_match->>'provider',
      lower(btrim(product_match->>'productId'))
    having count(*) > 1
  ) then
    raise exception
      'Cannot unify saved gifts: existing affiliate-product duplicates require review';
  end if;
end
$$;

alter table public.recipient_saved_gift_ideas
add column if not exists source_feedback_id uuid;

comment on column public.recipient_saved_gift_ideas.source_feedback_id is
  'Historical feedback row converted into this saved gift by the unified-saves migration.';

create unique index if not exists recipient_saved_gift_source_feedback_uidx
  on public.recipient_saved_gift_ideas (source_feedback_id)
  where source_feedback_id is not null;

create unique index if not exists recipient_saved_gift_normalized_title_uidx
  on public.recipient_saved_gift_ideas (
    user_id,
    recipient_id,
    lower(btrim(regexp_replace(title, '[^[:alnum:]]+', ' ', 'g')))
  )
  where product_match is null;

create unique index if not exists recipient_saved_gift_product_identity_uidx
  on public.recipient_saved_gift_ideas (
    user_id,
    recipient_id,
    (product_match->>'provider'),
    lower(btrim(product_match->>'productId'))
  )
  where product_match is not null;

create table if not exists public.recipient_gift_feedback_archive (
  feedback_id uuid primary key,
  user_id uuid not null,
  recipient_id uuid not null,
  suggestion_id uuid,
  suggestion_index integer,
  preference text not null check (preference in ('liked', 'disliked')),
  feedback_created_at timestamptz not null,
  archived_at timestamptz not null default now(),
  conversion_status text not null check (
    conversion_status in (
      'pending',
      'converted',
      'duplicate',
      'discarded',
      'unconvertible'
    )
  ),
  conversion_reason text,
  saved_gift_id uuid,
  suggestion_snapshot jsonb
);

comment on table public.recipient_gift_feedback_archive is
  'Restricted recovery record for the one-time liked/disliked feedback consolidation.';

alter table public.recipient_gift_feedback_archive enable row level security;
revoke all on table public.recipient_gift_feedback_archive from anon, authenticated;
grant all on table public.recipient_gift_feedback_archive to service_role;

insert into public.recipient_gift_feedback_archive (
  feedback_id,
  user_id,
  recipient_id,
  suggestion_id,
  suggestion_index,
  preference,
  feedback_created_at,
  conversion_status,
  suggestion_snapshot
)
select
  feedback.id,
  feedback.user_id,
  feedback.recipient_id,
  feedback.suggestion_id,
  feedback.suggestion_index,
  feedback.preference,
  feedback.created_at,
  'pending',
  case
    when jsonb_typeof(run.suggestions) = 'array'
      and feedback.suggestion_index is not null
      and feedback.suggestion_index >= 0
    then run.suggestions -> feedback.suggestion_index
    else null
  end
from public.recipient_gift_feedback as feedback
left join public.gift_suggestions as run
  on run.id = feedback.suggestion_id
on conflict (feedback_id) do nothing;

do $$
declare
  feedback_row record;
  suggestion jsonb;
  candidate_product_match jsonb;
  resolved_saved_gift_id uuid;
  normalized_title text;
begin
  for feedback_row in
    select
      feedback.*,
      run.user_id as run_user_id,
      run.recipient_id as run_recipient_id,
      run.suggestions as run_suggestions
    from public.recipient_gift_feedback as feedback
    left join public.gift_suggestions as run
      on run.id = feedback.suggestion_id
    join public.recipient_gift_feedback_archive as archive
      on archive.feedback_id = feedback.id
      and archive.conversion_status in ('pending', 'unconvertible')
    order by feedback.created_at, feedback.id
  loop
    if feedback_row.preference = 'disliked' then
      update public.recipient_gift_feedback_archive
      set conversion_status = 'discarded',
          conversion_reason = 'Disliked feedback is obsolete in the unified saved-gifts model.'
      where feedback_id = feedback_row.id;
      continue;
    end if;

    if feedback_row.run_suggestions is null then
      update public.recipient_gift_feedback_archive
      set conversion_status = 'unconvertible',
          conversion_reason = 'Referenced suggestion run is missing.'
      where feedback_id = feedback_row.id;
      continue;
    end if;

    if feedback_row.run_user_id <> feedback_row.user_id
      or feedback_row.run_recipient_id <> feedback_row.recipient_id
    then
      update public.recipient_gift_feedback_archive
      set conversion_status = 'unconvertible',
          conversion_reason = 'Suggestion-run ownership does not match feedback ownership.'
      where feedback_id = feedback_row.id;
      continue;
    end if;

    if jsonb_typeof(feedback_row.run_suggestions) <> 'array'
      or feedback_row.suggestion_index is null
      or feedback_row.suggestion_index < 0
    then
      update public.recipient_gift_feedback_archive
      set conversion_status = 'unconvertible',
          conversion_reason = 'Suggestion index is missing or invalid.'
      where feedback_id = feedback_row.id;
      continue;
    end if;

    suggestion := feedback_row.run_suggestions -> feedback_row.suggestion_index;
    normalized_title := nullif(btrim(suggestion->>'title'), '');
    if jsonb_typeof(suggestion) <> 'object' or normalized_title is null then
      update public.recipient_gift_feedback_archive
      set conversion_status = 'unconvertible',
          conversion_reason = 'Suggestion snapshot does not contain a valid title.'
      where feedback_id = feedback_row.id;
      continue;
    end if;

    candidate_product_match := suggestion->'productMatch';
    if not coalesce(
      jsonb_typeof(candidate_product_match) = 'object'
      and candidate_product_match->>'provider' in ('awin', 'amazon')
      and nullif(btrim(candidate_product_match->>'productId'), '') is not null
      and char_length(btrim(candidate_product_match->>'productId')) <= 300
      and nullif(btrim(candidate_product_match->>'merchant'), '') is not null
      and char_length(btrim(candidate_product_match->>'merchant')) <= 200
      and nullif(btrim(candidate_product_match->>'productTitle'), '') is not null
      and char_length(btrim(candidate_product_match->>'productTitle')) <= 1000
      and case candidate_product_match->>'provider'
        when 'awin' then candidate_product_match->>'affiliateUrl'
          ~ '^https://([A-Za-z0-9-]+[.])*awin1[.]com(?::443)?(?:/|$)'
        when 'amazon' then candidate_product_match->>'affiliateUrl'
          ~ '^https://([A-Za-z0-9-]+[.])*amazon[.]com(?::443)?(?:/|$)'
        else false
      end
      and case jsonb_typeof(candidate_product_match->'imageUrl')
        when 'null' then true
        when 'string' then candidate_product_match->>'imageUrl'
          ~ '^https://[^/@[:space:]]+(?::443)?(?:/|$)'
        else false
      end
      and case jsonb_typeof(candidate_product_match->'price')
        when 'null' then true
        when 'number' then (candidate_product_match->>'price')::numeric
          between 0 and 9999999999.99
        else false
      end
      and case jsonb_typeof(candidate_product_match->'currency')
        when 'null' then true
        when 'string' then candidate_product_match->>'currency' ~ '^[A-Z]{3}$'
        else false
      end
      and (
        candidate_product_match->>'provider' <> 'awin'
        or (
          jsonb_typeof(candidate_product_match->'imageUrl') = 'string'
          and jsonb_typeof(candidate_product_match->'price') = 'number'
          and jsonb_typeof(candidate_product_match->'currency') = 'string'
        )
      ),
      false
    ) then
      candidate_product_match := null;
    end if;

    select saved.id
    into resolved_saved_gift_id
    from public.recipient_saved_gift_ideas as saved
    where saved.user_id = feedback_row.user_id
      and saved.recipient_id = feedback_row.recipient_id
      and (
        (
          candidate_product_match is not null
          and saved.product_match is not null
          and saved.product_match->>'provider' = candidate_product_match->>'provider'
          and lower(btrim(saved.product_match->>'productId')) =
            lower(btrim(candidate_product_match->>'productId'))
        )
        or (
          (candidate_product_match is null or saved.product_match is null)
          and lower(btrim(regexp_replace(saved.title, '[^[:alnum:]]+', ' ', 'g'))) =
            lower(btrim(regexp_replace(normalized_title, '[^[:alnum:]]+', ' ', 'g')))
        )
      )
    order by saved.created_at
    limit 1;

    if resolved_saved_gift_id is not null then
      update public.recipient_gift_feedback_archive
      set conversion_status = 'duplicate',
          conversion_reason = 'An equivalent saved gift already exists.',
          saved_gift_id = resolved_saved_gift_id
      where feedback_id = feedback_row.id;
      continue;
    end if;

    insert into public.recipient_saved_gift_ideas (
      user_id,
      recipient_id,
      suggestion_id,
      title,
      tier,
      rationale,
      estimated_price_min,
      estimated_price_max,
      product_url,
      image_url,
      product_match,
      created_at,
      source_feedback_id
    )
    values (
      feedback_row.user_id,
      feedback_row.recipient_id,
      feedback_row.suggestion_id,
      normalized_title,
      nullif(btrim(suggestion->>'tier'), ''),
      coalesce(
        nullif(btrim(suggestion->>'why_it_fits'), ''),
        nullif(btrim(suggestion->>'short_description'), '')
      ),
      case when jsonb_typeof(suggestion->'price_min') = 'number'
        then (suggestion->>'price_min')::numeric else null end,
      case when jsonb_typeof(suggestion->'price_max') = 'number'
        then (suggestion->>'price_max')::numeric else null end,
      coalesce(
        candidate_product_match->>'affiliateUrl',
        case when suggestion->>'suggested_url' ~ '^https://' then suggestion->>'suggested_url' end
      ),
      coalesce(
        candidate_product_match->>'imageUrl',
        case when suggestion->>'image_url' ~ '^https://' then suggestion->>'image_url' end
      ),
      candidate_product_match,
      feedback_row.created_at,
      feedback_row.id
    )
    returning id into resolved_saved_gift_id;

    update public.recipient_gift_feedback_archive
    set conversion_status = 'converted',
        conversion_reason = 'Liked feedback converted to a saved gift.',
        saved_gift_id = resolved_saved_gift_id,
        suggestion_snapshot = suggestion
    where feedback_id = feedback_row.id;
  end loop;

  if exists (
    select 1
    from public.recipient_gift_feedback_archive as archive
    join public.recipient_gift_feedback as feedback
      on feedback.id = archive.feedback_id
    where archive.conversion_status in ('pending', 'unconvertible')
  ) then
    raise exception
      'Feedback consolidation aborted: one or more liked rows are not safely convertible';
  end if;

  if (
    select count(*) from public.recipient_gift_feedback
  ) <> (
    select count(*)
    from public.recipient_gift_feedback_archive as archive
    join public.recipient_gift_feedback as feedback
      on feedback.id = archive.feedback_id
  ) then
    raise exception
      'Feedback consolidation aborted: archive coverage does not match source rows';
  end if;

end
$$;

commit;
