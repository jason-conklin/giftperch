alter table public.recipient_saved_gift_ideas
add column if not exists product_match jsonb;

comment on column public.recipient_saved_gift_ideas.product_match is
  'Affiliate product snapshot captured when the gift idea is saved.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipient_saved_gift_product_match_object'
      and conrelid = 'public.recipient_saved_gift_ideas'::regclass
  ) then
    alter table public.recipient_saved_gift_ideas
    add constraint recipient_saved_gift_product_match_object
    check (
      product_match is null
      or coalesce((
        jsonb_typeof(product_match) = 'object'
        and jsonb_typeof(product_match->'provider') = 'string'
        and product_match->>'provider' in ('awin', 'amazon')
        and jsonb_typeof(product_match->'productId') = 'string'
        and char_length(btrim(product_match->>'productId')) between 1 and 300
        and jsonb_typeof(product_match->'merchant') = 'string'
        and char_length(btrim(product_match->>'merchant')) between 1 and 200
        and jsonb_typeof(product_match->'productTitle') = 'string'
        and char_length(btrim(product_match->>'productTitle')) between 1 and 1000
        and jsonb_typeof(product_match->'affiliateUrl') = 'string'
        and case product_match->>'provider'
          when 'awin' then product_match->>'affiliateUrl'
            ~ '^https://([A-Za-z0-9-]+[.])*awin1[.]com(?::443)?(?:/|$)'
          when 'amazon' then product_match->>'affiliateUrl'
            ~ '^https://([A-Za-z0-9-]+[.])*amazon[.]com(?::443)?(?:/|$)'
          else false
        end
        and case jsonb_typeof(product_match->'imageUrl')
          when 'null' then true
          when 'string' then product_match->>'imageUrl'
            ~ '^https://[^/@[:space:]]+(?::443)?(?:/|$)'
          else false
        end
        and case jsonb_typeof(product_match->'price')
          when 'null' then true
          when 'number' then (product_match->>'price')::numeric
            between 0 and 9999999999.99
          else false
        end
        and case jsonb_typeof(product_match->'currency')
          when 'null' then true
          when 'string' then product_match->>'currency' ~ '^[A-Z]{3}$'
          else false
        end
        and (
          product_match->>'provider' <> 'awin'
          or (
            jsonb_typeof(product_match->'imageUrl') = 'string'
            and jsonb_typeof(product_match->'price') = 'number'
            and jsonb_typeof(product_match->'currency') = 'string'
          )
        )
      ), false)
    );
  end if;
end
$$;
