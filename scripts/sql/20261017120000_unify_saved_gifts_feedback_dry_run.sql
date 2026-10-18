with feedback_source as (
  select
    feedback.id,
    feedback.user_id,
    feedback.recipient_id,
    feedback.preference,
    feedback.suggestion_index,
    run.id as run_id,
    run.user_id as run_user_id,
    run.recipient_id as run_recipient_id,
    case
      when jsonb_typeof(run.suggestions) = 'array'
        and feedback.suggestion_index is not null
        and feedback.suggestion_index >= 0
      then run.suggestions -> feedback.suggestion_index
      else null
    end as suggestion
  from public.recipient_gift_feedback as feedback
  left join public.gift_suggestions as run
    on run.id = feedback.suggestion_id
), classified as (
  select
    source.*,
    case
      when source.preference = 'disliked' then 'discarded'
      when source.run_id is null then 'orphaned'
      when source.run_user_id <> source.user_id
        or source.run_recipient_id <> source.recipient_id then 'ownership_mismatch'
      when jsonb_typeof(source.suggestion) <> 'object'
        or nullif(btrim(source.suggestion->>'title'), '') is null then 'unconvertible'
      when exists (
        select 1
        from public.recipient_saved_gift_ideas as saved
        where saved.user_id = source.user_id
          and saved.recipient_id = source.recipient_id
          and (
            (
              jsonb_typeof(source.suggestion->'productMatch') = 'object'
              and source.suggestion->'productMatch'->>'provider' in ('awin', 'amazon')
              and nullif(btrim(source.suggestion->'productMatch'->>'productId'), '') is not null
              and saved.product_match is not null
              and saved.product_match->>'provider' =
                source.suggestion->'productMatch'->>'provider'
              and lower(btrim(saved.product_match->>'productId')) =
                lower(btrim(source.suggestion->'productMatch'->>'productId'))
            )
            or (
              (
                jsonb_typeof(source.suggestion->'productMatch') <> 'object'
                or source.suggestion->'productMatch'->>'provider' not in ('awin', 'amazon')
                or nullif(btrim(source.suggestion->'productMatch'->>'productId'), '') is null
                or saved.product_match is null
              )
              and lower(btrim(regexp_replace(saved.title, '[^[:alnum:]]+', ' ', 'g'))) =
                lower(btrim(regexp_replace(source.suggestion->>'title', '[^[:alnum:]]+', ' ', 'g')))
            )
          )
      ) then 'duplicate'
      else 'convertible'
    end as migration_status
  from feedback_source as source
)
select
  migration_status,
  count(*) as record_count,
  (select count(*) from public.recipient_saved_gift_ideas)
    as current_saved_gifts,
  (select count(*) from public.recipient_saved_gift_ideas)
    + sum(count(*)) filter (where migration_status = 'convertible') over ()
    as projected_saved_gifts
from classified
group by migration_status
order by migration_status;

select
  count(*) as saved_gift_count,
  count(*) filter (where product_match is null) - count(distinct (
    user_id,
    recipient_id,
    lower(btrim(regexp_replace(title, '[^[:alnum:]]+', ' ', 'g')))
  )) filter (where product_match is null) as title_only_duplicate_count,
  count(*) filter (where product_match is not null) - count(distinct (
    user_id,
    recipient_id,
    product_match->>'provider',
    lower(btrim(product_match->>'productId'))
  )) filter (where product_match is not null) as affiliate_product_duplicate_count
from public.recipient_saved_gift_ideas;
