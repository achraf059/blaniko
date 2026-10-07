-- user_collections and user_collection_items: client-supplied UUID identity, names, ownership
-- enforced by the composite FK, cascade, isolation, anon and service_role.
-- Prepended by the runner with _helpers.sql.

-- ── collections: identity ──────────────────────────────────────────────────────
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

select is(public.t_state($q$insert into public.user_collections (id, name)
  values ('a0000000-0000-4000-8000-000000000001', 'Date nights')$q$), 'OK',
  'a collection with a client-provided UUID is accepted (user_id defaults to the caller)');
select is(public.t_state($q$insert into public.user_collections (name) values ('no id')$q$), '23502',
  'a missing id is rejected (there is no default)');
select is(public.t_state($q$insert into public.user_collections (id, name)
  values ('a0000000-0000-4000-8000-000000000001', 'Dup')$q$), '23505', 'a duplicate UUID is rejected');
select is(public.t_state($q$insert into public.user_collections (id, name, created_at)
  values ('a0000000-0000-4000-8000-000000000002', 'Old', '2023-03-04T05:06:07Z')$q$), 'OK',
  'a client-supplied created_at is accepted');
select is((select created_at from public.user_collections where id = 'a0000000-0000-4000-8000-000000000002'),
  '2023-03-04T05:06:07Z'::timestamptz, 'and preserved exactly');

-- The UUID is unique GLOBALLY: another user cannot create a row with an existing id.
select public.t_as('authenticated', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select is(public.t_state($q$insert into public.user_collections (id, name)
  values ('a0000000-0000-4000-8000-000000000001', 'B copy')$q$), '23505',
  'user B cannot reuse user A''s collection UUID (global uniqueness; the row stays A''s)');

-- ── names ──────────────────────────────────────────────────────────────────────
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state($q$insert into public.user_collections (id, name) values ('a0000000-0000-4000-8000-000000000003', '')$q$), '23514', 'an empty name is rejected');
select is(public.t_state($q$insert into public.user_collections (id, name) values ('a0000000-0000-4000-8000-000000000003', '   ')$q$), '23514', 'a blank (spaces) name is rejected');
select is(public.t_state($q$insert into public.user_collections (id, name) values ('a0000000-0000-4000-8000-000000000003', E'\t\n')$q$), '23514', 'a whitespace-only name is rejected');
select is(public.t_state($q$insert into public.user_collections (id, name) values ('a0000000-0000-4000-8000-000000000003', null)$q$), '23502', 'a NULL name is rejected');
select is(public.t_state($q$insert into public.user_collections (id, name) values ('a0000000-0000-4000-8000-000000000003', repeat('x', 1000))$q$), 'OK', 'a 1000-character name (the guard boundary) is accepted');
select is(public.t_state($q$insert into public.user_collections (id, name) values ('a0000000-0000-4000-8000-000000000004', repeat('x', 1001))$q$), '23514', 'a 1001-character name exceeds the abuse guard');
select is(public.t_state($q$insert into public.user_collections (id, name) values ('a0000000-0000-4000-8000-000000000005', 'Date nights')$q$), 'OK',
  'a duplicate NAME is allowed (two offline devices can both create the same default name)');
select is(public.t_state($q$update public.user_collections set name = '' where id = 'a0000000-0000-4000-8000-000000000001'$q$), '23514', 'renaming to blank is rejected');
select is(public.t_state($q$update public.user_collections set name = 'Renamed' where id = 'a0000000-0000-4000-8000-000000000001'$q$), 'OK', 'a rename is allowed');

-- ── collection items: validation ───────────────────────────────────────────────
select is(public.t_state($q$insert into public.user_collection_items (collection_id, venue_id)
  values ('a0000000-0000-4000-8000-000000000001', 'BLK-0001')$q$), 'OK',
  'A can add an item to her own collection (user_id defaults to the caller)');
select is(public.t_state($q$insert into public.user_collection_items (collection_id, venue_id)
  values ('a0000000-0000-4000-8000-000000000001', 'BLK-0002')$q$), 'OK', 'a second item');
select is(public.t_state($q$insert into public.user_collection_items (collection_id, venue_id)
  values ('a0000000-0000-4000-8000-000000000001', 'BLK-0001')$q$), '23505', 'the same venue twice in one collection is a PK violation');
select is(public.t_state($q$insert into public.user_collection_items (collection_id, venue_id)
  values ('a0000000-0000-4000-8000-000000000001', 'BLK-1')$q$), '23514', 'a malformed venue id is rejected');
select is(public.t_state($q$insert into public.user_collection_items (collection_id, venue_id)
  values ('a0000000-0000-4000-8000-000000000001', 'blk-0003')$q$), '23514', 'a lower-case venue id is rejected');
select is(public.t_state($q$insert into public.user_collection_items (collection_id, venue_id)
  values ('a0000000-0000-4000-8000-0000000000ff', 'BLK-0001')$q$), '23503', 'an item for a collection that does not exist is rejected');
select is(public.t_state($q$update public.user_collection_items set venue_id = 'BLK-0009'$q$), '42501', 'authenticated cannot UPDATE items');

-- ── collection items: OWNERSHIP IS ENFORCED BY THE DATABASE ────────────────────
reset role;
insert into public.user_collections (id, user_id, name)
  values ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B secret');
insert into public.user_collection_items (collection_id, user_id, venue_id)
  values ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'BLK-0100');

select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state($q$insert into public.user_collection_items (collection_id, user_id, venue_id)
  values ('b0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0200')$q$), '23503',
  'ATTACK 1: A inserts an item into B''s collection with user_id = A -> composite foreign key violation');
select is(public.t_state($q$insert into public.user_collection_items (collection_id, user_id, venue_id)
  values ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'BLK-0200')$q$), '42501',
  'ATTACK 2: A supplies user_id = B -> RLS WITH CHECK violation');
select is(public.t_state($q$insert into public.user_collection_items (collection_id, user_id, venue_id)
  values ('a0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'BLK-0200')$q$), '42501',
  'ATTACK 3: A''s own collection id with user_id = B -> rejected');

-- isolation
select is((select count(*)::int from public.user_collections where id = 'b0000000-0000-4000-8000-000000000001'), 0, 'A cannot read B''s collection');
select is((select count(*)::int from public.user_collection_items where venue_id = 'BLK-0100'), 0, 'A cannot read B''s items');
select is(public.t_state($q$update public.user_collections set name = 'hacked' where id = 'b0000000-0000-4000-8000-000000000001'$q$), 'OK',
  'A''s rename of B''s collection runs but matches no visible row');
select is(public.t_state($q$delete from public.user_collections where id = 'b0000000-0000-4000-8000-000000000001'$q$), 'OK', 'A''s delete of B''s collection runs but matches nothing');
select is(public.t_state($q$delete from public.user_collection_items where venue_id = 'BLK-0100'$q$), 'OK', 'A''s delete of B''s item runs but matches nothing');
reset role;
select is((select name from public.user_collections where id = 'b0000000-0000-4000-8000-000000000001'), 'B secret', 'B''s collection name is unchanged');
select is((select count(*)::int from public.user_collection_items where collection_id = 'b0000000-0000-4000-8000-000000000001'), 1, 'B''s item is intact');

-- ── immutable columns ──────────────────────────────────────────────────────────
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state($q$update public.user_collections set id = 'a0000000-0000-4000-8000-0000000000aa' where id = 'a0000000-0000-4000-8000-000000000001'$q$), '42501', 'id cannot be updated');
select is(public.t_state($q$update public.user_collections set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where id = 'a0000000-0000-4000-8000-000000000001'$q$), '42501', 'user_id cannot be updated (a collection cannot be given away)');
select is(public.t_state($q$update public.user_collections set created_at = now() where id = 'a0000000-0000-4000-8000-000000000001'$q$), '42501', 'created_at cannot be updated');
select is(public.t_state($q$update public.user_collections set updated_at = now() where id = 'a0000000-0000-4000-8000-000000000001'$q$), '42501', 'updated_at cannot be written by a client');

-- ── deleting a collection cascades its items ───────────────────────────────────
select is((select count(*)::int from public.user_collection_items where collection_id = 'a0000000-0000-4000-8000-000000000001'), 2, 'the collection has two items');
select is(public.t_state($q$delete from public.user_collections where id = 'a0000000-0000-4000-8000-000000000001'$q$), 'OK', 'A deletes her collection');
select is((select count(*)::int from public.user_collection_items where collection_id = 'a0000000-0000-4000-8000-000000000001'), 0, 'its items were deleted by the cascade');
reset role;
select is((select count(*)::int from public.user_collection_items where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0, 'no orphan item remains for A');

-- ── anon ───────────────────────────────────────────────────────────────────────
select public.t_as('anon', null);
select is(public.t_state($q$select count(*) from public.user_collections$q$), '42501', 'anon cannot SELECT collections');
select is(public.t_state($q$insert into public.user_collections (id, user_id, name) values ('a0000000-0000-4000-8000-0000000000bb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'x')$q$), '42501', 'anon cannot INSERT collections');
select is(public.t_state($q$select count(*) from public.user_collection_items$q$), '42501', 'anon cannot SELECT items');
select is(public.t_state($q$insert into public.user_collection_items (collection_id, user_id, venue_id) values ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'BLK-0300')$q$), '42501', 'anon cannot INSERT items');
select is(public.t_state($q$delete from public.user_collections$q$), '42501', 'anon cannot DELETE collections');

-- ── service_role ───────────────────────────────────────────────────────────────
select public.t_as('service_role', null);
select is((select count(*)::int from public.user_collections), 4, 'service_role sees every user''s collections: A keeps 3, B has 1 (bypasses RLS)');
select is(public.t_state($q$update public.user_collection_items set added_at = '2025-01-01'$q$), 'OK', 'service_role can UPDATE items');
select is(public.t_state($q$truncate public.user_collections cascade$q$), '42501', 'service_role cannot TRUNCATE');
select is(public.t_state($q$truncate public.user_collection_items$q$), '42501', 'service_role cannot TRUNCATE items');

reset role;
select * from finish();
rollback;
