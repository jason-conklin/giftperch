-- GiftPerch demo seed data
-- WARNING: Replace demo_user_id with an auth.users.id that exists in your project.
-- Example: select id, email from auth.users;

with const as (
  select
    '11111111-1111-1111-1111-111111111111'::uuid as demo_user_id,
    'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid as mom_id,
    'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::uuid as friend_id,
    'cccccccc-cccc-4ccc-cccc-cccccccccccc'::uuid as wishlist_id
)
insert into public.profiles (id, display_name, avatar_url, bio)
select demo_user_id, 'Demo User', null, 'Loves thoughtful gifting and testing PerchPal.'
from const
on conflict (id) do update set display_name = excluded.display_name;

insert into public.recipient_profiles (
  id,
  user_id,
  name,
  relationship,
  age_hint,
  gender,
  notes,
  annual_budget,
  gift_budget_min,
  gift_budget_max,
  birthday,
  pet_type
)
select
  mom_id,
  demo_user_id,
  'Mom',
  'mother',
  'early 60s',
  'female',
  'Spa days, gardening, cozy nights in.',
  500,
  75,
  150,
  '1965-05-12',
  null
from const
union all
select
  friend_id,
  demo_user_id,
  'Best Friend',
  'friend',
  'late 20s',
  'female',
  'Indie bookstore owner, hikes on weekends.',
  300,
  40,
  120,
  '1996-09-03',
  null
from const
on conflict (id) do nothing;

insert into public.recipient_interests (id, recipient_id, label, category)
values
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'gardening', 'hobby'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'spa rituals', 'experience'),
  (gen_random_uuid(), 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', 'indie books', 'hobby'),
  (gen_random_uuid(), 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', 'trail hiking', 'activity');

insert into public.recipient_events (id, recipient_id, event_type, label, event_date, notes)
values
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'birthday', 'Mom Birthday', '1965-05-12', 'Plan something relaxing.'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'holiday', 'Christmas', null, 'Family gathering.'),
  (gen_random_uuid(), 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', 'birthday', 'Best Friend Birthday', '1996-09-03', 'Find something locally made.');

insert into public.wishlists (id, user_id, title, description, is_public)
select wishlist_id, demo_user_id, 'Demo Wishlist', 'What others can buy for our demo user.', true
from const
on conflict (id) do nothing;

insert into public.wishlist_items (id, wishlist_id, title, url, price_estimate, notes, priority)
values
  (gen_random_uuid(), 'cccccccc-cccc-4ccc-cccc-cccccccccccc', 'Evergreen throw blanket', 'https://example.com/blanket', 120, 'Matches living room palette.', 1),
  (gen_random_uuid(), 'cccccccc-cccc-4ccc-cccc-cccccccccccc', 'Handmade ceramic mug duo', 'https://example.com/mugs', 60, 'Support small makers.', 2),
  (gen_random_uuid(), 'cccccccc-cccc-4ccc-cccc-cccccccccccc', 'Bookstore gift card', 'https://example.com/gift-card', 40, 'Can be used locally.', 3);

insert into public.gift_history (id, user_id, recipient_id, title, url, price, purchased_at, notes)
values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'Spa retreat voucher', 'https://example.com/spa', 200, timezone('utc', now()) - interval '40 days', 'Huge hit last Mother''s Day.'),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', 'Signed first-edition novel', 'https://example.com/book', 95, timezone('utc', now()) - interval '10 days', 'PerchPal recommendation.');

insert into public.gift_suggestions (id, user_id, recipient_id, model, prompt_context, suggestions)
values (
  'dddddddd-dddd-4ddd-dddd-dddddddddddd',
  '11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  'gpt-5.1',
  jsonb_build_object('occasion', 'birthday', 'budget', 120),
  jsonb_build_array(
    jsonb_build_object('title', 'Hiking essentials set', 'price', 110, 'reason', 'Matches her mountain trips.'),
    jsonb_build_object('title', 'Indie book subscription', 'price', 89, 'reason', 'Keeps her bookstore inspiration flowing.')
  )
);

insert into public.affiliate_clicks (id, user_id, recipient_id, suggestion_id, product_url, referrer, affiliate_program)
values (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  'dddddddd-dddd-4ddd-dddd-dddddddddddd',
  'https://amazon.com/example-product',
  'gifts page',
  'amazon'
);

insert into public.ai_interactions (id, user_id, recipient_id, role, message, metadata)
values
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    'user',
    'PerchPal, I need a birthday gift for my best friend who loves indie bookstores.',
    jsonb_build_object('occasion', 'birthday', 'budget', 150)
  ),
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    'assistant',
    'How about a curated indie book subscription paired with a handcrafted mug?',
    jsonb_build_object('model', 'gpt-5.1', 'temperature', 0.4)
  );
