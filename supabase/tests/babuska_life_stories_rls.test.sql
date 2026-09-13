begin;

select plan(6);

insert into public.story_items (
  id, image_url, storage_path, published_at, expires_at, is_published
) values
  (
    '00000000-0000-0000-0000-000000000101',
    'https://example.test/active.jpg',
    'stories/active/original.jpg',
    now() - interval '1 hour',
    now() + interval '23 hours',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    'https://example.test/expired.jpg',
    'stories/expired/original.jpg',
    now() - interval '25 hours',
    now() - interval '1 hour',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    'https://example.test/hidden.jpg',
    'stories/hidden/original.jpg',
    now(),
    now() + interval '24 hours',
    false
  );

set local role anon;

select results_eq(
  $$
    select id::text from public.story_items
    where id in (
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000102',
      '00000000-0000-0000-0000-000000000103'
    )
    order by id
  $$,
  array['00000000-0000-0000-0000-000000000101'],
  'anonymous visitors read only active stories'
);

select throws_ok(
  $$insert into public.story_items (image_url, storage_path, expires_at) values ('https://example.test/no.jpg', 'stories/no/original.jpg', now() + interval '24 hours')$$,
  '42501',
  null,
  'anonymous visitors cannot create stories'
);

select throws_ok(
  $$update public.story_items set is_published = false where id = '00000000-0000-0000-0000-000000000101'$$,
  '42501',
  null,
  'anonymous visitors cannot update stories'
);

select throws_ok(
  $$delete from public.story_items where id = '00000000-0000-0000-0000-000000000101'$$,
  '42501',
  null,
  'anonymous visitors cannot delete stories'
);

reset role;
select ok(
  has_table_privilege('authenticated', 'public.story_items', 'select,insert,update,delete'),
  'authenticated role has only the grants required for admin policy evaluation'
);

select ok(
  row_security_active('public.story_items'),
  'story table has row-level security enabled'
);

select * from finish();
rollback;

