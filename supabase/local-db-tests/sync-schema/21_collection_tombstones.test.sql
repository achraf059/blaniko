-- Collection tombstones (Phase 3A-4A): deleted_at, scrub, immutability, privileges, RLS, child purge,
-- the live-parent guard, the parent revision bump, trigger/function posture, account-deletion cascade.
-- Contract: docs/database/sync-schema.md ("Collection tombstones"). Prepended by the runner with _helpers.sql.
--
-- Real concurrency (two sessions, lock waits) cannot be shown inside one transaction; it is proved by
-- scripts/db/test-collection-tombstone-concurrency-local.sh.
-- A transaction has one now(), so "updated_at moved" is shown by back-dating the stored value (the
-- set_updated_at trigger is switched off for that one fixture statement) and observing the new value.

-- ── helpers (rolled back with the transaction) ─────────────────────────────────
create function public.t_cid(n int) returns uuid language sql immutable
  as $$ select ('c1000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;

-- number of rows the statement affected
create function public.t_rows(q text) returns int language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end $$;

-- back-dates a collection's updated_at (owner only: clients cannot write it)
create function public.t_backdate(cid uuid) returns void language plpgsql as $$
begin
  alter table public.user_collections disable trigger set_updated_at;
  update public.user_collections set updated_at = '2000-01-01T00:00:00Z' where id = cid;
  alter table public.user_collections enable trigger set_updated_at;
end $$;

-- ── A. catalog: column, constraint, functions, triggers ────────────────────────
select has_column('public', 'user_collections', 'deleted_at', 'user_collections.deleted_at exists');
select col_type_is('public', 'user_collections', 'deleted_at', 'timestamp with time zone', 'deleted_at is timestamptz');
select col_is_null('public', 'user_collections', 'deleted_at', 'deleted_at is nullable');
select col_hasnt_default('public', 'user_collections', 'deleted_at', 'deleted_at has no default');
select ok(
  (select pg_get_constraintdef(oid) ~ 'deleted_at IS NULL' and pg_get_constraintdef(oid) ~ 'Deleted collection'
     from pg_constraint where conrelid = 'public.user_collections'::regclass and conname = 'user_collections_tombstone_scrubbed'),
  'the at-rest scrub CHECK exists: a tombstoned row can only carry the neutral name');

create temp table t_fn as
  select p.oid, p.proname::text as proname, p.prosecdef, pg_get_userbyid(p.proowner) as owner, p.proconfig, p.prosrc
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.proname in ('user_collections_tombstone_guard', 'user_collections_purge_items', 'user_collection_items_lock_parent',
                       'user_collection_items_bump_parent_on_insert', 'user_collection_items_bump_parent_on_delete');
select is((select count(*)::int from t_fn), 5, 'the five new trigger functions exist');
select set_eq($$select proname from t_fn where prosecdef$$,
  $$values ('user_collection_items_bump_parent_on_insert'), ('user_collection_items_bump_parent_on_delete')$$,
  'exactly the two revision-bump functions are SECURITY DEFINER');
select is((select count(*)::int from t_fn where prosecdef and owner <> 'postgres'), 0, 'the SECURITY DEFINER functions are owned by postgres');
select is((select count(*)::int from t_fn where not ('search_path=""' = any (proconfig))), 0, 'every new function pins search_path to the empty string');
select is((select count(*)::int from t_fn where prosrc ~* '\mexecute\M'), 0, 'no new function uses dynamic SQL');
select ok(
  not exists (select 1 from t_fn f, aclexplode((select proacl from pg_proc where oid = f.oid)) a
               where a.grantee = 0 or a.grantee in (select oid from pg_roles where rolname in ('anon', 'authenticated', 'service_role'))),
  'neither PUBLIC, anon, authenticated nor service_role holds EXECUTE on any new function');
select ok(
  not exists (select 1 from t_fn f where has_function_privilege('anon', f.oid, 'EXECUTE') or has_function_privilege('authenticated', f.oid, 'EXECUTE')
                or has_function_privilege('service_role', f.oid, 'EXECUTE')),
  'no client role can execute any new function (effective privilege)');
select is(public.t_state('select public.user_collection_items_bump_parent_on_insert()'), '0A000',
  'even the owner cannot call a trigger function directly (trigger functions run only as triggers)');
select is(public.t_state('select public.user_collection_items_bump_parent_on_delete()'), '0A000', '...the delete variant likewise');

select set_eq($$select tgname::text from pg_trigger where tgrelid = 'public.user_collections'::regclass and not tgisinternal$$,
  $$values ('set_updated_at'), ('user_collections_tombstone_guard'), ('user_collections_purge_items')$$,
  'user_collections carries exactly: set_updated_at (unchanged), the tombstone guard and the child purge');
select set_eq($$select tgname::text from pg_trigger where tgrelid = 'public.user_collection_items'::regclass and not tgisinternal$$,
  $$values ('user_collection_items_lock_parent'), ('user_collection_items_bump_parent_on_insert'), ('user_collection_items_bump_parent_on_delete')$$,
  'user_collection_items carries exactly the lock-parent trigger and the two bump triggers');
select ok((select pg_get_triggerdef(oid) ~ 'BEFORE INSERT OR UPDATE ON public.user_collections FOR EACH ROW'
           from pg_trigger where tgname = 'user_collections_tombstone_guard'), 'the guard is BEFORE INSERT OR UPDATE, per row');
select ok((select pg_get_triggerdef(oid) ~ 'AFTER UPDATE ON public.user_collections FOR EACH ROW WHEN' and pg_get_triggerdef(oid) ~ 'deleted_at IS NULL'
           from pg_trigger where tgname = 'user_collections_purge_items'), 'the purge is AFTER UPDATE per row, only when deleted_at goes from NULL to non-NULL');
select ok((select pg_get_triggerdef(oid) ~ 'BEFORE INSERT OR DELETE ON public.user_collection_items FOR EACH ROW'
           from pg_trigger where tgname = 'user_collection_items_lock_parent'), 'the parent lock is BEFORE INSERT OR DELETE, per row');
select ok((select pg_get_triggerdef(oid) ~ 'AFTER INSERT ON public.user_collection_items REFERENCING NEW TABLE AS inserted_items FOR EACH STATEMENT'
           from pg_trigger where tgname = 'user_collection_items_bump_parent_on_insert'), 'the insert bump is a statement trigger over a transition table');
select ok((select pg_get_triggerdef(oid) ~ 'AFTER DELETE ON public.user_collection_items REFERENCING OLD TABLE AS deleted_items FOR EACH STATEMENT'
           from pg_trigger where tgname = 'user_collection_items_bump_parent_on_delete'), 'the delete bump is a statement trigger over a transition table');
select is((select count(*)::int from pg_trigger where not tgisinternal and tgenabled <> 'O'
            and tgrelid in ('public.user_collections'::regclass, 'public.user_collection_items'::regclass)), 0, 'every trigger is enabled');

-- ── B. privileges and policies ─────────────────────────────────────────────────
select ok(not has_table_privilege('authenticated', 'public.user_collections', 'DELETE'), 'authenticated has no DELETE on user_collections');
select ok(not has_table_privilege('service_role', 'public.user_collections', 'DELETE'), 'service_role has no DELETE on user_collections');
select ok(not has_table_privilege('anon', 'public.user_collections', 'DELETE'), 'anon has no DELETE on user_collections');
select ok(has_table_privilege('authenticated', 'public.user_collections', 'SELECT') and has_table_privilege('authenticated', 'public.user_collections', 'INSERT'),
  'authenticated keeps SELECT and INSERT on user_collections');
select ok(has_table_privilege('service_role', 'public.user_collections', 'SELECT') and has_table_privilege('service_role', 'public.user_collections', 'INSERT')
  and has_table_privilege('service_role', 'public.user_collections', 'UPDATE'), 'service_role keeps SELECT, INSERT and UPDATE on user_collections');
select ok(has_column_privilege('authenticated', 'public.user_collections', 'name', 'UPDATE'), 'authenticated can still UPDATE name');
select ok(has_column_privilege('authenticated', 'public.user_collections', 'deleted_at', 'UPDATE'), 'authenticated can UPDATE deleted_at (the tombstone request)');
select is((select count(*)::int from unnest(array['id', 'user_id', 'created_at', 'updated_at']) as c
            where has_column_privilege('authenticated', 'public.user_collections', c, 'UPDATE')), 0,
  'authenticated still cannot UPDATE id, user_id, created_at or updated_at');
select ok(has_table_privilege('authenticated', 'public.user_collection_items', 'SELECT') and has_table_privilege('authenticated', 'public.user_collection_items', 'INSERT')
  and has_table_privilege('authenticated', 'public.user_collection_items', 'DELETE')
  and not has_any_column_privilege('authenticated', 'public.user_collection_items', 'UPDATE'), 'authenticated on items is unchanged: SELECT, INSERT, DELETE, no UPDATE');
select ok(has_table_privilege('service_role', 'public.user_collection_items', 'SELECT') and has_table_privilege('service_role', 'public.user_collection_items', 'INSERT')
  and has_table_privilege('service_role', 'public.user_collection_items', 'DELETE')
  and not has_table_privilege('service_role', 'public.user_collection_items', 'UPDATE')
  and not has_any_column_privilege('service_role', 'public.user_collection_items', 'UPDATE'),
  'service_role on items is exactly SELECT, INSERT, DELETE (no UPDATE, not even column-level)');
select ok(not has_table_privilege('anon', 'public.user_collection_items', 'SELECT') and not has_any_column_privilege('anon', 'public.user_collection_items', 'UPDATE')
  and not has_table_privilege('anon', 'public.user_collection_items', 'INSERT') and not has_table_privilege('anon', 'public.user_collection_items', 'DELETE'),
  'anon has nothing on items');
select set_eq($$select policyname::text || '|' || cmd from pg_policies where schemaname = 'public' and tablename = 'user_collections'$$,
  $$values ('authenticated users can select own collections|SELECT'), ('authenticated users can insert own collections|INSERT'),
           ('authenticated users can update own collections|UPDATE')$$,
  'user_collections keeps its own-row SELECT, INSERT and UPDATE policies and has no DELETE policy');
select set_eq($$select policyname::text || '|' || cmd from pg_policies where schemaname = 'public' and tablename = 'user_collection_items'$$,
  $$values ('authenticated users can select own collection items|SELECT'), ('authenticated users can insert own collection items|INSERT'),
           ('authenticated users can delete own collection items|DELETE')$$, 'the item policies are untouched');

-- ── C. fixtures ────────────────────────────────────────────────────────────────
reset role;
insert into public.user_collections (id, user_id, name) values
  (public.t_cid(1), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Trip'),
  (public.t_cid(2), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Stays live'),
  (public.t_cid(3), 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B live');
insert into public.user_collection_items (collection_id, user_id, venue_id) values
  (public.t_cid(1), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0001'),
  (public.t_cid(1), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0002'),
  (public.t_cid(1), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0003'),
  (public.t_cid(2), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0001'),
  (public.t_cid(3), 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'BLK-0001');
select public.t_backdate(public.t_cid(1));
select public.t_backdate(public.t_cid(2));
select is((select updated_at from public.user_collections where id = public.t_cid(1)), '2000-01-01'::timestamptz, 'precondition: the Trip collection is back-dated');

-- ── D. own tombstone ───────────────────────────────────────────────────────────
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
-- a stale baseline matches nothing (zero rows), the collection stays live
select is(public.t_rows(format($f$update public.user_collections set deleted_at = now() where id = %L and updated_at = '1999-01-01T00:00:00Z' and deleted_at is null$f$, public.t_cid(1))),
  0, 'a conditional tombstone from a stale updated_at affects zero rows');
select is((select deleted_at from public.user_collections where id = public.t_cid(1)), null::timestamptz, 'and the collection is still live');
select is((select count(*)::int from public.user_collection_items where collection_id = public.t_cid(1)), 3, 'with its three items');
-- the real request: a forged timestamp from 1999
select is(public.t_rows(format($f$update public.user_collections set deleted_at = '1999-12-31T00:00:00Z' where id = %L and updated_at = '2000-01-01T00:00:00Z' and deleted_at is null$f$, public.t_cid(1))),
  1, 'the conditional tombstone from the current updated_at affects one row');
select is((select deleted_at from public.user_collections where id = public.t_cid(1)), now(), 'the supplied timestamp was ignored: deleted_at is the server''s time');
select is((select name from public.user_collections where id = public.t_cid(1)), 'Deleted collection', 'the name is scrubbed to exactly "Deleted collection"');
select is((select updated_at from public.user_collections where id = public.t_cid(1)), now(), 'updated_at moved (set_updated_at)');
select is((select count(*)::int from public.user_collections where id = public.t_cid(1) and deleted_at is not null), 1, 'the tombstone remains SELECTable by its owner');
select is((select count(*)::int from public.user_collection_items where collection_id = public.t_cid(1)), 0, 'all three items were removed in the same transaction');
select is((select count(*)::int from public.user_collection_items where collection_id = public.t_cid(2)), 1, 'another collection''s items are untouched');
select is((select deleted_at from public.user_collections where id = public.t_cid(2)), null::timestamptz, 'another collection is still live');
reset role;
select is((select count(*)::int from public.user_collections where id = public.t_cid(1) and user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 1,
  'the row stays under its original UUID and owner');

-- a rename and a tombstone in one request: the scrub wins
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
reset role;
insert into public.user_collections (id, user_id, name) values (public.t_cid(4), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Original');
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state(format($f$update public.user_collections set name = 'Smuggled', deleted_at = now() where id = %L$f$, public.t_cid(4))), 'OK',
  'a request naming both a new name and deleted_at is accepted...');
select is((select name from public.user_collections where id = public.t_cid(4)), 'Deleted collection', '...and the requested name is discarded');

-- ── E. immutability ────────────────────────────────────────────────────────────
select is(public.t_state(format('update public.user_collections set deleted_at = null where id = %L', public.t_cid(1))), 'TS002', 'tombstone -> live is rejected (TS002)');
select is((select deleted_at is not null from public.user_collections where id = public.t_cid(1)), true, '...and the tombstone is intact');
select is(public.t_state(format($f$update public.user_collections set name = 'Revived' where id = %L$f$, public.t_cid(1))), 'TS002', 'renaming a tombstone is rejected (TS002)');
select is(public.t_state(format('update public.user_collections set deleted_at = now() where id = %L', public.t_cid(1))), 'TS002', 'a second tombstone update is rejected (TS002)');
select is(public.t_state(format('update public.user_collections set name = name where id = %L', public.t_cid(1))), 'TS002', 'even a no-op UPDATE of a tombstone is rejected (TS002)');
select is(public.t_state(format($f$insert into public.user_collections (id, name) values (%L, 'x') on conflict (id) do update set name = excluded.name$f$, public.t_cid(1))),
  'TS002', 'a merge-upsert (DO UPDATE) by the owner onto her own tombstone is rejected (TS002): it cannot be revived by re-creating it');
select is(public.t_state($f$insert into public.user_collections (id, name, deleted_at) values ('c1000000-0000-4000-8000-0000000000e1', 'x', now())$f$), 'TS002',
  'an INSERT that names a non-null deleted_at is rejected (no pre-tombstoned collection)');
select is(public.t_state(format($f$insert into public.user_collections (id, name) values (%L, 'again') on conflict (id) do nothing$f$, public.t_cid(1))), 'OK',
  'an idempotent create (DO NOTHING) of a tombstoned id is a silent skip');
select is((select name from public.user_collections where id = public.t_cid(1)), 'Deleted collection', '...that leaves the tombstone as it was');
select public.t_as('authenticated', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select is(public.t_state(format($f$insert into public.user_collections (id, name) values (%L, 'B reuse')$f$, public.t_cid(1))), '23505',
  'another user cannot reuse a tombstoned UUID (the primary-key row stays)');
select public.t_as('service_role', null);
select is(public.t_state(format($f$update public.user_collections set name = 'svc edit' where id = %L$f$, public.t_cid(1))), 'TS002', 'service_role cannot edit a tombstone either (TS002)');
select is(public.t_state(format('update public.user_collections set deleted_at = null where id = %L', public.t_cid(1))), 'TS002', 'service_role cannot clear deleted_at (TS002)');
select is(public.t_state($f$insert into public.user_collections (id, user_id, name, deleted_at) values ('c1000000-0000-4000-8000-0000000000e2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'x', now())$f$),
  'TS002', 'service_role cannot create a pre-tombstoned collection (TS002)');
select is(public.t_state(format('delete from public.user_collections where id = %L', public.t_cid(2))), '42501', 'service_role cannot physically DELETE a collection');
select is(public.t_state(format($f$update public.user_collections set name = 'svc live edit' where id = %L$f$, public.t_cid(2))), 'OK', 'service_role can still UPDATE a live collection');

-- ── F. privileges in action, RLS ───────────────────────────────────────────────
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state(format('delete from public.user_collections where id = %L', public.t_cid(2))), '42501', 'authenticated cannot physically DELETE even her own live collection');
select is(public.t_state('delete from public.user_collections'), '42501', 'nor delete all of them');
select is(public.t_state(format($f$update public.user_collections set updated_at = '2001-01-01' where id = %L$f$, public.t_cid(2))), '42501', 'a client still cannot write updated_at (forged updated_at stays impossible)');
select is(public.t_state(format($f$update public.user_collections set name = 'Renamed' where id = %L$f$, public.t_cid(2))), 'OK', 'a live rename still works');
-- cross-user: A asks to tombstone B's collection; RLS hides the row, nothing changes
select is(public.t_rows(format('update public.user_collections set deleted_at = now() where id = %L', public.t_cid(3))), 0, 'A cannot tombstone B''s collection (zero rows)');
select public.t_as('authenticated', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select is((select deleted_at from public.user_collections where id = public.t_cid(3)), null::timestamptz, 'B''s collection is still live');
select is((select count(*)::int from public.user_collections where id = public.t_cid(1)), 0, 'B cannot read A''s tombstone');
select is(public.t_rows(format('update public.user_collections set deleted_at = now() where id = %L', public.t_cid(3))), 1, 'B can tombstone her own collection');
select public.t_as('anon', null);
select is(public.t_state('select count(*) from public.user_collections'), '42501', 'anon cannot read collections');
select is(public.t_state(format('update public.user_collections set deleted_at = now() where id = %L', public.t_cid(2))), '42501', 'anon cannot request a tombstone');
select is(public.t_state(format('delete from public.user_collections where id = %L', public.t_cid(2))), '42501', 'anon cannot DELETE');

-- ── G. children: the live-parent guard ─────────────────────────────────────────
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state(format($f$insert into public.user_collection_items (collection_id, venue_id) values (%L, 'BLK-0777')$f$, public.t_cid(1))), 'TS001',
  'an item INSERT under a tombstoned collection is rejected with TS001');
select is(public.t_state(format($f$insert into public.user_collection_items (collection_id, venue_id) values (%L, 'BLK-0777') on conflict do nothing$f$, public.t_cid(1))), 'TS001',
  'also when written as ON CONFLICT DO NOTHING');
select is(public.t_state(format($f$insert into public.user_collection_items (collection_id, venue_id) values (%L, 'BLK-0777'), (%L, 'BLK-0778')$f$, public.t_cid(2), public.t_cid(1))), 'TS001',
  'a multi-row insert with one tombstoned parent fails as a whole');
select is((select count(*)::int from public.user_collection_items where venue_id in ('BLK-0777', 'BLK-0778')), 0, '...and nothing of it was stored');
reset role;
select is(public.t_state(format($f$insert into public.user_collection_items (collection_id, user_id, venue_id) values (%L, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0777')$f$, public.t_cid(1))), 'TS001',
  'the owner role (superuser) cannot add an item under a tombstone either');
select public.t_as('service_role', null);
select is(public.t_state(format($f$insert into public.user_collection_items (collection_id, user_id, venue_id) values (%L, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0777')$f$, public.t_cid(1))), 'TS001',
  'nor can service_role');
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state($f$insert into public.user_collection_items (collection_id, venue_id) values ('c1000000-0000-4000-8000-0000000000ff', 'BLK-0001')$f$), '23503',
  'an item for a collection that does not exist still fails with the foreign-key error');
select is(public.t_state(format($f$insert into public.user_collection_items (collection_id, user_id, venue_id) values (%L, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0001')$f$, public.t_cid(3))), '23503',
  'an item naming another user''s collection with her own user_id still fails with the foreign-key error');
select is(public.t_state(format($f$insert into public.user_collection_items (collection_id, user_id, venue_id) values (%L, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'BLK-0001')$f$, public.t_cid(3))), '42501',
  'an item for another user''s collection with that user_id still fails RLS');
select is(public.t_state(format($f$insert into public.user_collection_items (collection_id, venue_id) values (%L, 'BLK-0004')$f$, public.t_cid(2))), 'OK', 'an item INSERT on a live parent succeeds');
select is(public.t_state(format($f$delete from public.user_collection_items where collection_id = %L and venue_id = 'BLK-0004'$f$, public.t_cid(2))), 'OK', 'an item DELETE on a live parent succeeds');
select is((select count(*)::int from public.user_collection_items where collection_id = public.t_cid(2) and venue_id = 'BLK-0004'), 0, '...and the item is gone');

-- ── H. the parent revision bump ────────────────────────────────────────────────
reset role;
create table public.t_upd_log (collection_id uuid, live boolean);
grant all on public.t_upd_log to public;
create function public.t_log_parent_upd() returns trigger language plpgsql as
  $$ begin insert into public.t_upd_log values (new.id, new.deleted_at is null); return null; end $$;
create trigger t_log_parent_upd after update on public.user_collections for each row execute function public.t_log_parent_upd();

insert into public.user_collections (id, user_id, name) values
  (public.t_cid(10), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Bump one'),
  (public.t_cid(11), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Bump two');
select public.t_backdate(public.t_cid(10));
select public.t_backdate(public.t_cid(11));
delete from public.t_upd_log;

select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state(format($f$insert into public.user_collection_items (collection_id, venue_id) values (%L, 'BLK-0500')$f$, public.t_cid(10))), 'OK', 'item INSERT into Bump one');
reset role;
select is((select updated_at from public.user_collections where id = public.t_cid(10)), now(), 'an item INSERT bumped the parent''s updated_at');
select is((select updated_at from public.user_collections where id = public.t_cid(11)), '2000-01-01'::timestamptz, 'and only that parent');
select is((select count(*)::int from public.t_upd_log where collection_id = public.t_cid(10) and live), 1, 'with exactly one parent UPDATE');

select public.t_backdate(public.t_cid(10));
delete from public.t_upd_log;
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state(format($f$delete from public.user_collection_items where collection_id = %L and venue_id = 'BLK-0500'$f$, public.t_cid(10))), 'OK', 'item DELETE from Bump one');
reset role;
select is((select updated_at from public.user_collections where id = public.t_cid(10)), now(), 'an item DELETE bumped the parent''s updated_at');
select is((select count(*)::int from public.t_upd_log where collection_id = public.t_cid(10) and live), 1, 'with exactly one parent UPDATE');

-- a skipped ON CONFLICT DO NOTHING row bumps nothing
insert into public.user_collection_items (collection_id, user_id, venue_id) values (public.t_cid(10), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0501');
select public.t_backdate(public.t_cid(10));
delete from public.t_upd_log;
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state(format($f$insert into public.user_collection_items (collection_id, venue_id) values (%L, 'BLK-0501') on conflict do nothing$f$, public.t_cid(10))), 'OK', 'a repeated (idempotent) insert is absorbed');
reset role;
select is((select updated_at from public.user_collections where id = public.t_cid(10)), '2000-01-01'::timestamptz, 'a skipped ON CONFLICT DO NOTHING row did not bump the parent');
select is((select count(*)::int from public.t_upd_log), 0, 'and issued no parent UPDATE at all');

-- one statement, many rows, one parent: one bump
delete from public.t_upd_log;
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state(format($f$insert into public.user_collection_items (collection_id, venue_id) values (%L, 'BLK-0510'), (%L, 'BLK-0511'), (%L, 'BLK-0512')$f$,
  public.t_cid(10), public.t_cid(10), public.t_cid(10))), 'OK', 'a three-row insert');
reset role;
select is((select count(*)::int from public.t_upd_log where collection_id = public.t_cid(10) and live), 1, 'bumped the parent exactly once for the whole statement');
delete from public.t_upd_log;
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state(format($f$delete from public.user_collection_items where collection_id = %L and venue_id in ('BLK-0510', 'BLK-0511', 'BLK-0512')$f$, public.t_cid(10))), 'OK', 'a three-row delete');
reset role;
select is((select count(*)::int from public.t_upd_log where collection_id = public.t_cid(10) and live), 1, 'bumped the parent exactly once for the whole statement');

-- a statement over two parents bumps each of them once
insert into public.user_collection_items (collection_id, user_id, venue_id) values
  (public.t_cid(10), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0520'), (public.t_cid(11), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0520');
delete from public.t_upd_log;
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state($f$delete from public.user_collection_items where venue_id = 'BLK-0520'$f$), 'OK', 'one DELETE that spans two collections');
reset role;
select is((select count(distinct collection_id)::int from public.t_upd_log where live), 2, 'bumped each of the two parents...');
select is((select count(*)::int from public.t_upd_log where live), 2, '...exactly once');

-- a failed statement leaves no bump
select public.t_backdate(public.t_cid(10));
delete from public.t_upd_log;
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state(format($f$insert into public.user_collection_items (collection_id, venue_id) values (%L, 'BLK-0530'), (%L, 'bad')$f$, public.t_cid(10), public.t_cid(10))), '23514',
  'a multi-row insert whose second row violates a CHECK fails');
reset role;
select is((select updated_at from public.user_collections where id = public.t_cid(10)), '2000-01-01'::timestamptz, 'a failed item statement left no bump');
select is((select count(*)::int from public.t_upd_log), 0, '...and no parent UPDATE survives');

-- the tombstone purge performs no extra live-parent bump
insert into public.user_collections (id, user_id, name) values (public.t_cid(12), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Purge me');
insert into public.user_collection_items (collection_id, user_id, venue_id) values
  (public.t_cid(12), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0601'), (public.t_cid(12), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0602'), (public.t_cid(12), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0603');
delete from public.t_upd_log;
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_rows(format('update public.user_collections set deleted_at = now() where id = %L', public.t_cid(12))), 1, 'tombstone a collection with three items');
reset role;
select is((select count(*)::int from public.t_upd_log where collection_id = public.t_cid(12)), 1, 'exactly one parent UPDATE happened: the tombstone itself');
select is((select count(*)::int from public.t_upd_log where collection_id = public.t_cid(12) and live), 0, 'and the purge did not bump the tombstoned parent as if it were live');
select is((select count(*)::int from public.user_collection_items where collection_id = public.t_cid(12)), 0, 'the three children are gone');
drop trigger t_log_parent_upd on public.user_collections;

-- ── I. distinct responsibilities: the guard and set_updated_at do not depend on each other ──
insert into public.user_collections (id, user_id, name) values
  (public.t_cid(30), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'No updated_at trigger'),
  (public.t_cid(31), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'No guard');
select public.t_backdate(public.t_cid(30));
select public.t_backdate(public.t_cid(31));
alter table public.user_collections disable trigger set_updated_at;
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_rows(format('update public.user_collections set deleted_at = now() where id = %L', public.t_cid(30))), 1, 'with set_updated_at switched off, a tombstone request still works...');
reset role;
select is((select deleted_at is not null and deleted_at = now() and name = 'Deleted collection' from public.user_collections where id = public.t_cid(30)), true, '...the guard alone stamps deleted_at and scrubs the name');
select is((select updated_at from public.user_collections where id = public.t_cid(30)), '2000-01-01'::timestamptz, '...and does not touch updated_at');
alter table public.user_collections enable trigger set_updated_at;
alter table public.user_collections disable trigger user_collections_tombstone_guard;
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state(format($f$update public.user_collections set name = 'Edited' where id = %L$f$, public.t_cid(31))), 'OK', 'with the guard switched off, a live edit works...');
reset role;
select is((select updated_at from public.user_collections where id = public.t_cid(31)), now(), '...and set_updated_at alone moves updated_at');
alter table public.user_collections enable trigger user_collections_tombstone_guard;

-- ── J. account deletion removes live collections, tombstones and children ──────
insert into auth.users (id) values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
insert into public.user_collections (id, user_id, name) values
  (public.t_cid(40), 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'D live'),
  (public.t_cid(41), 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'D to tombstone'),
  (public.t_cid(42), 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'E live'),
  (public.t_cid(43), 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'E to tombstone');
insert into public.user_collection_items (collection_id, user_id, venue_id) values
  (public.t_cid(40), 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'BLK-0701'), (public.t_cid(41), 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'BLK-0702'),
  (public.t_cid(42), 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'BLK-0703'), (public.t_cid(43), 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'BLK-0704');
select public.t_as('authenticated', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
select is(public.t_rows(format('update public.user_collections set deleted_at = now() where id = %L', public.t_cid(41))), 1, 'user D tombstones one collection');
select public.t_as('authenticated', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
select is(public.t_rows(format('update public.user_collections set deleted_at = now() where id = %L', public.t_cid(43))), 1, 'user E tombstones one collection');
reset role;
select is((select count(*)::int from public.user_collections where user_id in ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') and deleted_at is not null), 2,
  'precondition: two tombstones and two live collections exist');
-- D: deleted by the platform's auth admin role (neither authenticated nor service_role is involved)
-- (that role cannot see the pgTAP schema, so its result is captured and asserted after the role is reset)
set local role supabase_auth_admin;
select public.t_state($q$delete from auth.users where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'$q$) as auth_admin_delete \gset
reset role;
select is(:'auth_admin_delete'::text, 'OK'::text, 'the auth admin role deletes user D (the cascade does not depend on client DELETE privileges)');
-- E: deleted by the database owner
delete from auth.users where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
select is((select count(*)::int from public.user_collections where user_id in ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')), 0,
  'account deletion removed the live collections and the tombstones');
select is((select count(*)::int from public.user_collection_items where user_id in ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')), 0, '...and all their items');
select is((select count(*)::int from public.user_collections where id in (public.t_cid(41), public.t_cid(43))), 0, 'no tombstone survives account deletion');
select is((select count(*)::int from public.user_collections where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 8, 'an unrelated user''s eight collections are untouched');

-- ── K. items are immutable for EVERY role: membership changes are INSERT / DELETE only ──────────────
-- (service_role used to hold UPDATE on items; it could re-parent an item under a tombstoned collection without
-- passing the guard, the lock or the revision bump. The privilege is gone.)
reset role;
insert into public.user_collections (id, user_id, name) values
  (public.t_cid(50), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Move from'),
  (public.t_cid(51), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Move to'),
  (public.t_cid(52), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Tombstoned target');
insert into public.user_collection_items (collection_id, user_id, venue_id, added_at) values
  (public.t_cid(50), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0800', '2020-01-01T00:00:00Z');
update public.user_collections set deleted_at = now() where id = public.t_cid(52);

select public.t_as('service_role', null);
select is(public.t_state(format('update public.user_collection_items set collection_id = %L where venue_id = %L', public.t_cid(52), 'BLK-0800')), '42501',
  'service_role UPDATE of collection_id is denied (the re-parenting hole is closed)');
select is(public.t_state(format('update public.user_collection_items set collection_id = %L where venue_id = %L', public.t_cid(51), 'BLK-0800')), '42501',
  'service_role cannot move an item to a LIVE collection by UPDATE either');
select is(public.t_state($q$update public.user_collection_items set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where venue_id = 'BLK-0800'$q$), '42501', 'service_role UPDATE of user_id is denied');
select is(public.t_state(format($f$update public.user_collection_items set venue_id = 'BLK-0801' where collection_id = %L$f$, public.t_cid(50))), '42501', 'service_role UPDATE of venue_id is denied');
select is(public.t_state($q$update public.user_collection_items set added_at = '2030-01-01'$q$), '42501', 'service_role UPDATE of added_at is denied (table-level UPDATE is gone too)');
select is(public.t_state(format('update public.user_collection_items set collection_id = collection_id where venue_id = %L', 'BLK-0800')), '42501', 'even a no-op UPDATE is denied');
reset role;
select is((select collection_id from public.user_collection_items where venue_id = 'BLK-0800'), public.t_cid(50), 'the item is exactly where it was');
select is((select added_at from public.user_collection_items where venue_id = 'BLK-0800'), '2020-01-01T00:00:00Z'::timestamptz, '...with its added_at untouched');
select is((select count(*)::int from public.user_collection_items where collection_id = public.t_cid(52)), 0, 'and nothing sits under the tombstoned collection');

-- what service_role still has
select public.t_as('service_role', null);
select is(public.t_state('select count(*) from public.user_collection_items'), 'OK', 'service_role can still SELECT items');
select is(public.t_state(format($f$insert into public.user_collection_items (collection_id, user_id, venue_id) values (%L, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0802')$f$, public.t_cid(50))), 'OK', 'service_role can still INSERT an item');
select is(public.t_state(format($f$delete from public.user_collection_items where collection_id = %L and venue_id = 'BLK-0802'$f$, public.t_cid(50))), 'OK', 'service_role can still DELETE an item');

-- the supported replacement pattern: DELETE the old membership, INSERT the new one, both through the protocol
reset role;
create table public.t_upd_log2 (collection_id uuid, live boolean);
grant all on public.t_upd_log2 to public;
create function public.t_log_parent_upd2() returns trigger language plpgsql as
  $$ begin insert into public.t_upd_log2 values (new.id, new.deleted_at is null); return null; end $$;
create trigger t_log_parent_upd2 after update on public.user_collections for each row execute function public.t_log_parent_upd2();
select public.t_backdate(public.t_cid(50));
select public.t_backdate(public.t_cid(51));
delete from public.t_upd_log2;
select public.t_as('service_role', null);
select is(public.t_state(format($f$delete from public.user_collection_items where collection_id = %L and venue_id = 'BLK-0800'$f$, public.t_cid(50))), 'OK',
  'replacement step 1: service_role DELETEs the old membership');
reset role;
select is((select updated_at from public.user_collections where id = public.t_cid(50)), now(), '...which bumped the OLD parent''s updated_at');
select is((select updated_at from public.user_collections where id = public.t_cid(51)), '2000-01-01'::timestamptz, '...and not the new parent''s');
select public.t_as('service_role', null);
select is(public.t_state(format($f$insert into public.user_collection_items (collection_id, user_id, venue_id, added_at) values (%L, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0800', '2020-01-01T00:00:00Z')$f$, public.t_cid(51))), 'OK',
  'replacement step 2: service_role INSERTs the membership under the new parent');
reset role;
select is((select updated_at from public.user_collections where id = public.t_cid(51)), now(), '...which bumped the NEW parent''s updated_at');
select is((select count(*)::int from public.t_upd_log2 where live), 2, 'exactly one parent UPDATE per statement: two in total');
select is((select count(distinct collection_id)::int from public.t_upd_log2 where collection_id in (public.t_cid(50), public.t_cid(51)) and live), 2, '...one for each of the two parents');
select is((select collection_id from public.user_collection_items where venue_id = 'BLK-0800'), public.t_cid(51), 'the membership now lives under the new parent, with the original added_at');
-- the same replacement toward a TOMBSTONED parent: the INSERT half is refused by the guard
select public.t_as('service_role', null);
select is(public.t_state(format($f$delete from public.user_collection_items where collection_id = %L and venue_id = 'BLK-0800'$f$, public.t_cid(51))), 'OK', 'replacement toward a tombstone, step 1: DELETE');
select is(public.t_state(format($f$insert into public.user_collection_items (collection_id, user_id, venue_id) values (%L, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BLK-0800')$f$, public.t_cid(52))), 'TS001',
  'replacement toward a tombstone, step 2: the INSERT is refused with TS001 (no way around the guard remains)');
reset role;
select is((select count(*)::int from public.user_collection_items where collection_id = public.t_cid(52)), 0, 'nothing sits under the tombstoned collection');
drop trigger t_log_parent_upd2 on public.user_collections;

select * from finish();
rollback;
