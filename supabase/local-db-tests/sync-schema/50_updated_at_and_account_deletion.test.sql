-- updated_at is SERVER-CONTROLLED on INSERT and on UPDATE for every table that has it, and
-- account deletion cascades. Prepended by the runner with _helpers.sql.
--
-- A transaction has one now(), so "changed again" cannot be seen by two statements in one
-- transaction. These tests therefore back-date the stored value (with the trigger switched
-- off for that one fixture statement, inside this rolled-back transaction) and show the
-- trigger rewriting it. The runner adds a separate probe over real, separate transactions.

-- fixtures are back-dated with the trigger disabled, then it is re-enabled
alter table public.user_collections disable trigger set_updated_at;
alter table public.user_outings disable trigger set_updated_at;
alter table public.user_taste_profiles disable trigger set_updated_at;
insert into public.user_collections (id, user_id, name, created_at, updated_at)
  values ('d0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c', '2000-01-01', '2000-01-01');
insert into public.user_outings (id, user_id, schema_version, payload, created_at, updated_at)
  values ('d0000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1,
          '{"name":{"en":"o"},"stopIds":[],"answers":{}}', '2000-01-01', '2000-01-01');
insert into public.user_taste_profiles (user_id, interests, created_at, updated_at)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', array['padel'], '2000-01-01', '2000-01-01');
alter table public.user_collections enable trigger set_updated_at;
alter table public.user_outings enable trigger set_updated_at;
alter table public.user_taste_profiles enable trigger set_updated_at;

select is((select count(*)::int from pg_trigger where tgname = 'set_updated_at' and not tgisinternal and tgenabled = 'O'), 3,
  'all three triggers are enabled again');
select is((select updated_at from public.user_collections where id = 'd0000000-0000-4000-8000-000000000001'),
  '2000-01-01'::timestamptz, 'precondition: the collection fixture is back-dated');

-- ── UPDATE writes updated_at; created_at is left alone ─────────────────────────
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state($q$update public.user_collections set name = 'c2' where id = 'd0000000-0000-4000-8000-000000000001'$q$), 'OK', 'collection update');
select is(public.t_state($q$update public.user_outings set payload = '{"name":{"en":"o2"},"stopIds":[],"answers":{}}' where id = 'd0000000-0000-4000-8000-000000000002'$q$), 'OK', 'outing update');
select is(public.t_state($q$update public.user_taste_profiles set interests = array['wellness']$q$), 'OK', 'taste profile update');
reset role;

select is((select updated_at from public.user_collections where id = 'd0000000-0000-4000-8000-000000000001'), now(), 'collections: an UPDATE rewrote the back-dated updated_at with server time');
select is((select updated_at from public.user_outings where id = 'd0000000-0000-4000-8000-000000000002'), now(), 'outings: an UPDATE rewrote the back-dated updated_at with server time');
select is((select updated_at from public.user_taste_profiles where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), now(), 'taste profiles: an UPDATE rewrote the back-dated updated_at with server time');
select is((select created_at from public.user_collections where id = 'd0000000-0000-4000-8000-000000000001'), '2000-01-01'::timestamptz, 'collections: created_at untouched');
select is((select created_at from public.user_outings where id = 'd0000000-0000-4000-8000-000000000002'), '2000-01-01'::timestamptz, 'outings: created_at untouched');
select is((select created_at from public.user_taste_profiles where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), '2000-01-01'::timestamptz, 'taste profiles: created_at untouched');

-- ── INSERT: a client-supplied updated_at is overwritten (user D, authenticated) ─
select public.t_as('authenticated', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');

-- collections
select is(public.t_state($q$insert into public.user_collections (id, name, created_at, updated_at)
  values ('e0000000-0000-4000-8000-000000000001', 'forged', '2001-02-03T04:05:06Z', '2000-01-01T00:00:00Z')$q$), 'OK',
  'collections: an INSERT that names updated_at = 2000-01-01 succeeds');
select isnt((select updated_at from public.user_collections where id = 'e0000000-0000-4000-8000-000000000001'), '2000-01-01T00:00:00Z'::timestamptz,
  'collections: the stored updated_at is NOT the supplied timestamp');
select is((select updated_at from public.user_collections where id = 'e0000000-0000-4000-8000-000000000001'), now(),
  'collections: it is the server''s time');
select is((select created_at from public.user_collections where id = 'e0000000-0000-4000-8000-000000000001'), '2001-02-03T04:05:06Z'::timestamptz,
  'collections: the client-supplied created_at is still preserved');

-- outings
select is(public.t_state($q$insert into public.user_outings (id, schema_version, payload, created_at, updated_at)
  values ('e0000000-0000-4000-8000-000000000002', 1, '{"name":{"en":"o"},"stopIds":[],"answers":{}}', '2001-02-03T04:05:06Z', '2000-01-01T00:00:00Z')$q$), 'OK',
  'outings: an INSERT that names updated_at = 2000-01-01 succeeds');
select isnt((select updated_at from public.user_outings where id = 'e0000000-0000-4000-8000-000000000002'), '2000-01-01T00:00:00Z'::timestamptz,
  'outings: the stored updated_at is NOT the supplied timestamp');
select is((select updated_at from public.user_outings where id = 'e0000000-0000-4000-8000-000000000002'), now(), 'outings: it is the server''s time');
select is((select created_at from public.user_outings where id = 'e0000000-0000-4000-8000-000000000002'), '2001-02-03T04:05:06Z'::timestamptz,
  'outings: the client-supplied created_at is still preserved');

-- taste profiles
select is(public.t_state($q$insert into public.user_taste_profiles (interests, profile_updated_at, created_at, updated_at)
  values (array['padel'], '2026-03-04T05:06:07Z', '2001-02-03T04:05:06Z', '2000-01-01T00:00:00Z')$q$), 'OK',
  'taste profiles: an INSERT that names updated_at = 2000-01-01 succeeds');
select isnt((select updated_at from public.user_taste_profiles), '2000-01-01T00:00:00Z'::timestamptz,
  'taste profiles: the stored updated_at is NOT the supplied timestamp');
select is((select updated_at from public.user_taste_profiles), now(), 'taste profiles: it is the server''s time');
select is((select profile_updated_at from public.user_taste_profiles), '2026-03-04T05:06:07Z'::timestamptz,
  'taste profiles: the client-supplied profile_updated_at (the last-write-wins key) is still preserved');
select is((select created_at from public.user_taste_profiles), '2001-02-03T04:05:06Z'::timestamptz,
  'taste profiles: the client-supplied created_at is still preserved');

-- A later UPDATE changes updated_at again: back-date the row (trigger off, as the owner), then update as the client.
reset role;
alter table public.user_collections disable trigger set_updated_at;
alter table public.user_outings disable trigger set_updated_at;
alter table public.user_taste_profiles disable trigger set_updated_at;
update public.user_collections set updated_at = '2002-02-02' where id = 'e0000000-0000-4000-8000-000000000001';
update public.user_outings set updated_at = '2002-02-02' where id = 'e0000000-0000-4000-8000-000000000002';
update public.user_taste_profiles set updated_at = '2002-02-02' where user_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
alter table public.user_collections enable trigger set_updated_at;
alter table public.user_outings enable trigger set_updated_at;
alter table public.user_taste_profiles enable trigger set_updated_at;

select public.t_as('authenticated', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
select is(public.t_state($q$update public.user_collections set name = 'forged 2' where id = 'e0000000-0000-4000-8000-000000000001'$q$), 'OK', 'collections: a later update');
select is(public.t_state($q$update public.user_outings set schema_version = 1 where id = 'e0000000-0000-4000-8000-000000000002'$q$), 'OK', 'outings: a later update');
select is(public.t_state($q$update public.user_taste_profiles set setting = 'indoor'$q$), 'OK', 'taste profiles: a later update');
select is((select updated_at from public.user_collections where id = 'e0000000-0000-4000-8000-000000000001'), now(), 'collections: the later UPDATE changed updated_at again');
select is((select updated_at from public.user_outings where id = 'e0000000-0000-4000-8000-000000000002'), now(), 'outings: the later UPDATE changed updated_at again');
select is((select updated_at from public.user_taste_profiles), now(), 'taste profiles: the later UPDATE changed updated_at again');

-- ── authenticated still cannot UPDATE the column directly ──────────────────────
select ok(not has_column_privilege('authenticated', 'public.user_collections', 'updated_at', 'UPDATE'), 'collections: no column UPDATE privilege on updated_at');
select ok(not has_column_privilege('authenticated', 'public.user_outings', 'updated_at', 'UPDATE'), 'outings: no column UPDATE privilege on updated_at');
select ok(not has_column_privilege('authenticated', 'public.user_taste_profiles', 'updated_at', 'UPDATE'), 'taste profiles: no column UPDATE privilege on updated_at');
select is(public.t_state($q$update public.user_collections set updated_at = '2000-01-01' where id = 'e0000000-0000-4000-8000-000000000001'$q$), '42501', 'collections: an UPDATE naming updated_at is denied');
select is(public.t_state($q$update public.user_outings set updated_at = '2000-01-01' where id = 'e0000000-0000-4000-8000-000000000002'$q$), '42501', 'outings: an UPDATE naming updated_at is denied');
select is(public.t_state($q$update public.user_taste_profiles set updated_at = '2000-01-01'$q$), '42501', 'taste profiles: an UPDATE naming updated_at is denied');

-- ── the server value also wins over the service role ───────────────────────────
select public.t_as('service_role', null);
select is(public.t_state($q$insert into public.user_collections (id, user_id, name, updated_at)
  values ('e0000000-0000-4000-8000-000000000003', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'svc', '1999-01-01')$q$), 'OK', 'service_role may name updated_at on INSERT...');
select is(public.t_state($q$update public.user_collections set updated_at = '1999-01-01' where id = 'd0000000-0000-4000-8000-000000000001'$q$), 'OK', '...and on UPDATE...');
reset role;
select is((select updated_at from public.user_collections where id = 'e0000000-0000-4000-8000-000000000003'), now(), '...but the trigger overwrites it on INSERT');
select is((select updated_at from public.user_collections where id = 'd0000000-0000-4000-8000-000000000001'), now(), '...and on UPDATE');

-- ── account deletion cascades through every table ──────────────────────────────
insert into public.user_saved_venues (user_id, venue_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'BLK-0001'), ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'BLK-0001');
insert into public.user_collections (id, user_id, name) values
  ('d0000000-0000-4000-8000-0000000000c1', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'C col'),
  ('d0000000-0000-4000-8000-0000000000b1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B col');
insert into public.user_collection_items (collection_id, user_id, venue_id) values
  ('d0000000-0000-4000-8000-0000000000c1', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'BLK-0001'),
  ('d0000000-0000-4000-8000-0000000000b1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'BLK-0001');
insert into public.user_outings (id, user_id, schema_version, payload) values
  ('d0000000-0000-4000-8000-0000000000c2', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 1, '{"name":{"en":"c"},"stopIds":[],"answers":{}}'),
  ('d0000000-0000-4000-8000-0000000000b2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 1, '{"name":{"en":"b"},"stopIds":[],"answers":{}}');
insert into public.user_taste_profiles (user_id) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc'), ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

select is((select count(*)::int from public.user_saved_venues where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'), 1, 'precondition: user C has saved venues');

delete from auth.users where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

select is((select count(*)::int from public.user_saved_venues where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'), 0, 'deleting the account removes saved venues');
select is((select count(*)::int from public.user_collections where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'), 0, 'deleting the account removes collections');
select is((select count(*)::int from public.user_collection_items where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'), 0, 'deleting the account removes collection items (through the collection)');
select is((select count(*)::int from public.user_outings where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'), 0, 'deleting the account removes outings');
select is((select count(*)::int from public.user_taste_profiles where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'), 0, 'deleting the account removes the taste profile');
select is((select count(*)::int from public.user_saved_venues where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
        + (select count(*)::int from public.user_collections where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
        + (select count(*)::int from public.user_collection_items where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
        + (select count(*)::int from public.user_outings where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
        + (select count(*)::int from public.user_taste_profiles where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  5, 'another user''s five rows are untouched');

select * from finish();
rollback;
