-- Outing tombstones (Phase 3A-4B): deleted_at, scrub, immutability, privileges, RLS, conditional revision,
-- trigger independence, account-deletion cascade. Contract: docs/database/sync-schema.md ("Outing tombstones").
-- Prepended by the runner with _helpers.sql. Existing outing coverage stays in 30_user_outings.test.sql.
--
-- Real two-session concurrency (lock waits, both orderings) is proved by
-- scripts/db/test-outing-tombstone-concurrency-local.sh. A transaction has one now(), so "updated_at moved"
-- is shown by back-dating the stored value (the set_updated_at trigger is switched off for that one fixture
-- statement) and observing the new value.

-- ── helpers (rolled back with the transaction) ─────────────────────────────────
create function public.t_xid(n int) returns uuid language sql immutable
  as $$ select ('d1000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;

-- a rich, fully authored outing: every part of it must disappear on tombstone
create function public.t_rich() returns jsonb language sql immutable as $$
  select '{"name":{"en":"Secret plan","fr":"Plan secret"},"why":{"en":"Private why","fr":"Pourquoi prive"},"stopIds":["BLK-0001","BLK-0002","BLK-0003"],"answers":{"who":"friends","mood":"active","time":"half","area":"Maarif"}}'::jsonb $$;
create function public.t_scrub() returns jsonb language sql immutable as $$
  select '{"name":{"en":"Deleted outing"},"stopIds":[],"answers":{}}'::jsonb $$;

create function public.t_rows(q text) returns int language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end $$;

create function public.t_backdate_o(oid uuid) returns void language plpgsql as $$
begin
  alter table public.user_outings disable trigger set_updated_at;
  update public.user_outings set updated_at = '2000-01-01T00:00:00Z' where id = oid;
  alter table public.user_outings enable trigger set_updated_at;
end $$;

-- ── A. catalog ─────────────────────────────────────────────────────────────────
select has_column('public', 'user_outings', 'deleted_at', 'user_outings.deleted_at exists');
select col_type_is('public', 'user_outings', 'deleted_at', 'timestamp with time zone', 'deleted_at is timestamptz');
select col_is_null('public', 'user_outings', 'deleted_at', 'deleted_at is nullable');
select col_hasnt_default('public', 'user_outings', 'deleted_at', 'deleted_at has no default');
select ok(
  (select pg_get_constraintdef(oid) ~ 'deleted_at IS NULL' and pg_get_constraintdef(oid) ~ 'schema_version = 1' and pg_get_constraintdef(oid) ~ 'Deleted outing'
     from pg_constraint where conrelid = 'public.user_outings'::regclass and conname = 'user_outings_tombstone_scrubbed'),
  'the at-rest scrub CHECK exists: a tombstoned row can only carry schema_version 1 and the scrub payload');
select ok((select pg_get_constraintdef(oid) ~ 'schema_version = 1' from pg_constraint where conrelid = 'public.user_outings'::regclass and conname = 'user_outings_schema_version_known'),
  'the existing schema_version CHECK is untouched');
select ok((select pg_get_constraintdef(oid) ~ '32768' from pg_constraint where conrelid = 'public.user_outings'::regclass and conname = 'user_outings_payload_size_guard'),
  'the existing payload-size CHECK is untouched');
select ok((select pg_get_constraintdef(oid) ~ 'is_valid_outing_payload_v1' from pg_constraint where conrelid = 'public.user_outings'::regclass and conname = 'user_outings_payload_valid_v1'),
  'the existing payload-validator CHECK is untouched');

create temp table t_fn as
  select p.oid, p.proname::text as proname, p.prosecdef, pg_get_userbyid(p.proowner) as owner, p.proconfig, p.prosrc
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'user_outings_tombstone_guard';
select is((select count(*)::int from t_fn), 1, 'the outing tombstone guard function exists');
select is((select count(*)::int from t_fn where prosecdef), 0, 'it is SECURITY INVOKER');
select is((select count(*)::int from t_fn where 'search_path=""' = any (proconfig)), 1, 'it pins search_path to the empty string');
select is((select count(*)::int from t_fn where prosrc ~* '\mexecute\M'), 0, 'it uses no dynamic SQL');
select ok(
  not exists (select 1 from t_fn f, aclexplode((select proacl from pg_proc where oid = f.oid)) a
               where a.grantee = 0 or a.grantee in (select oid from pg_roles where rolname in ('anon', 'authenticated', 'service_role')))
  and not exists (select 1 from t_fn f where has_function_privilege('anon', f.oid, 'EXECUTE') or has_function_privilege('authenticated', f.oid, 'EXECUTE')
                   or has_function_privilege('service_role', f.oid, 'EXECUTE')),
  'no client role (nor PUBLIC) can execute it');
select is(public.t_state('select public.user_outings_tombstone_guard()'), '0A000', 'nobody can call the trigger function directly');
select is((select count(*)::int from pg_proc where pronamespace = 'public'::regnamespace and prosecdef
            and proname in ('user_outings_tombstone_guard', 'user_collection_items_bump_parent_on_insert', 'user_collection_items_bump_parent_on_delete',
                            'user_collections_tombstone_guard', 'user_collections_purge_items', 'user_collection_items_lock_parent')), 2,
  'across all Phase 3A functions exactly two are SECURITY DEFINER: the outing migration added none');
select set_eq($$select tgname::text from pg_trigger where tgrelid = 'public.user_outings'::regclass and not tgisinternal$$,
  $$values ('set_updated_at'), ('user_outings_tombstone_guard')$$, 'user_outings carries exactly set_updated_at (unchanged) and the tombstone guard');
select ok((select pg_get_triggerdef(oid) ~ 'BEFORE INSERT OR UPDATE ON public.user_outings FOR EACH ROW'
           from pg_trigger where tgname = 'user_outings_tombstone_guard'), 'the guard is BEFORE INSERT OR UPDATE, per row');
select is((select count(*)::int from pg_trigger where not tgisinternal and tgrelid = 'public.user_outings'::regclass and tgenabled <> 'O'), 0, 'every outing trigger is enabled');
select set_eq($$select tgname::text from pg_trigger where tgrelid = 'public.user_collections'::regclass and not tgisinternal$$,
  $$values ('set_updated_at'), ('user_collections_tombstone_guard'), ('user_collections_purge_items')$$, 'the collection triggers are unchanged by this migration');
select set_eq($$select tgname::text from pg_trigger where tgrelid = 'public.user_collection_items'::regclass and not tgisinternal$$,
  $$values ('user_collection_items_lock_parent'), ('user_collection_items_bump_parent_on_insert'), ('user_collection_items_bump_parent_on_delete')$$, 'the item triggers are unchanged by this migration');

-- ── B. privileges and policies ─────────────────────────────────────────────────
select ok(not has_table_privilege('authenticated', 'public.user_outings', 'DELETE'), 'authenticated has no DELETE on user_outings');
select ok(not has_table_privilege('service_role', 'public.user_outings', 'DELETE'), 'service_role has no DELETE on user_outings');
select ok(not has_table_privilege('anon', 'public.user_outings', 'DELETE'), 'anon has no DELETE on user_outings');
select ok(has_table_privilege('authenticated', 'public.user_outings', 'SELECT') and has_table_privilege('authenticated', 'public.user_outings', 'INSERT'),
  'authenticated keeps SELECT and INSERT');
select ok(has_table_privilege('service_role', 'public.user_outings', 'SELECT') and has_table_privilege('service_role', 'public.user_outings', 'INSERT')
  and has_table_privilege('service_role', 'public.user_outings', 'UPDATE'), 'service_role keeps SELECT, INSERT and UPDATE');
select is((select count(*)::int from unnest(array['schema_version', 'payload', 'deleted_at']) as c
            where not has_column_privilege('authenticated', 'public.user_outings', c, 'UPDATE')), 0, 'authenticated can UPDATE schema_version, payload and deleted_at');
select is((select count(*)::int from unnest(array['id', 'user_id', 'created_at', 'updated_at']) as c
            where has_column_privilege('authenticated', 'public.user_outings', c, 'UPDATE')), 0, 'authenticated cannot UPDATE id, user_id, created_at or updated_at');
select ok(not has_any_column_privilege('anon', 'public.user_outings', 'SELECT') and not has_any_column_privilege('anon', 'public.user_outings', 'UPDATE')
  and not has_table_privilege('anon', 'public.user_outings', 'INSERT'), 'anon has nothing on user_outings');
select set_eq($$select policyname::text || '|' || cmd from pg_policies where schemaname = 'public' and tablename = 'user_outings'$$,
  $$values ('authenticated users can select own outings|SELECT'), ('authenticated users can insert own outings|INSERT'), ('authenticated users can update own outings|UPDATE')$$,
  'user_outings keeps its own-row SELECT, INSERT and UPDATE policies and has no DELETE policy');

-- ── C. the scrub constant passes the real validator and the size guard ─────────
select ok(public.is_valid_outing_payload_v1(public.t_scrub()), 'the scrub payload passes public.is_valid_outing_payload_v1');
select ok(octet_length(public.t_scrub()::text) <= 32768, 'and the 32768-byte payload-size guard');
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select ok(public.is_valid_outing_payload_v1(public.t_scrub()), '...also when evaluated with the client''s own privileges');
reset role;
select ok(public.is_valid_outing_payload_v1(public.t_rich()), 'precondition: the rich fixture payload is itself a valid version-1 payload');

-- ── D. fixtures ────────────────────────────────────────────────────────────────
insert into public.user_outings (id, user_id, schema_version, payload, created_at) values
  (public.t_xid(1), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, public.t_rich(), '2024-05-06T07:08:09Z'),
  (public.t_xid(2), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, public.t_rich(), now()),
  (public.t_xid(3), 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 1, public.t_rich(), now());
select public.t_backdate_o(public.t_xid(1));
select public.t_backdate_o(public.t_xid(2));

-- ── E. own tombstone, conditional revision ─────────────────────────────────────
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_rows(format($f$update public.user_outings set deleted_at = now() where id = %L and updated_at = '1999-01-01T00:00:00Z' and deleted_at is null$f$, public.t_xid(1))),
  0, 'a conditional tombstone from a STALE updated_at affects zero rows');
select is((select deleted_at from public.user_outings where id = public.t_xid(1)), null::timestamptz, '...and the outing is still live');
select is((select payload from public.user_outings where id = public.t_xid(1)), public.t_rich(), '...with its authored payload intact');
select is(public.t_rows(format($f$update public.user_outings set deleted_at = '1999-12-31T00:00:00Z', payload = '{"name":{"en":"Smuggled"},"stopIds":[],"answers":{}}'
  where id = %L and updated_at = '2000-01-01T00:00:00Z' and deleted_at is null$f$, public.t_xid(1))),
  1, 'the conditional tombstone from the CURRENT updated_at affects exactly one row (it also tried to smuggle in a new payload)');
select is((select deleted_at from public.user_outings where id = public.t_xid(1)), now(), 'the supplied timestamp was ignored: deleted_at is the server''s time');
select is((select schema_version from public.user_outings where id = public.t_xid(1)), 1::smallint, 'schema_version is 1');
select is((select payload from public.user_outings where id = public.t_xid(1)), public.t_scrub(), 'the payload is exactly the scrub constant (the smuggled payload was discarded)');
select is((select payload::text !~* '(Secret|Plan secret|Private|Pourquoi|BLK-|friends|active|half|Maarif|Smuggled)' from public.user_outings where id = public.t_xid(1)), true,
  'no authored name, why, stop id or planner answer remains anywhere in the row');
select is((select payload -> 'why' is null and jsonb_array_length(payload -> 'stopIds') = 0 and payload -> 'answers' = '{}'::jsonb from public.user_outings where id = public.t_xid(1)), true,
  'why is absent, stopIds is empty and answers is empty');
select is((select updated_at from public.user_outings where id = public.t_xid(1)), now(), 'updated_at moved (set_updated_at)');
select is((select created_at from public.user_outings where id = public.t_xid(1)), '2024-05-06T07:08:09Z'::timestamptz, 'created_at is preserved');
select is((select count(*)::int from public.user_outings where id = public.t_xid(1) and deleted_at is not null), 1, 'the tombstone remains SELECTable by its owner');
reset role;
select is((select count(*)::int from public.user_outings where id = public.t_xid(1) and user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 1, 'the row stays under its original UUID and owner');

-- retry convergence: the repeated request does nothing, the row is not even rewritten
reset role;
create temp table t_xmin as select xmin::text as x from public.user_outings where id = public.t_xid(1);   -- recorded as the owner
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_rows(format($f$update public.user_outings set deleted_at = now() where id = %L and updated_at = '2000-01-01T00:00:00Z' and deleted_at is null$f$, public.t_xid(1))), 0,
  'REPEATING the conditional tombstone with the old baseline affects zero rows');
select is(public.t_rows(format($f$update public.user_outings set deleted_at = now() where id = %L and updated_at = now() and deleted_at is null$f$, public.t_xid(1))), 0,
  'and with the tombstone''s own revision it affects zero rows too (deleted_at IS NULL filters it out)');
reset role;
select is((select xmin::text from public.user_outings where id = public.t_xid(1)), (select x from t_xmin), 'the row version did not change: nothing was rewritten');
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is((select payload from public.user_outings where id = public.t_xid(1)), public.t_scrub(), 'the row remains tombstoned and scrubbed');
select is(public.t_state(format($f$insert into public.user_outings (id, schema_version, payload) values (%L, 1, %L::jsonb)$f$, public.t_xid(1), public.t_rich())), '23505', 'the UUID remains occupied (a re-create of the id is a duplicate)');
select is(public.t_state(format($f$insert into public.user_outings (id, schema_version, payload) values (%L, 1, %L::jsonb) on conflict (id) do nothing$f$, public.t_xid(1), public.t_rich())), 'OK',
  'an idempotent create (DO NOTHING) of the tombstoned id is a silent skip...');
select is((select payload from public.user_outings where id = public.t_xid(1)), public.t_scrub(), '...that leaves the tombstone as it was (the original payload was NOT restored)');

-- ── F. immutability ────────────────────────────────────────────────────────────
select is(public.t_state(format('update public.user_outings set deleted_at = null where id = %L', public.t_xid(1))), 'TS002', 'tombstone -> live is rejected (TS002)');
select is(public.t_state(format($f$update public.user_outings set payload = %L::jsonb where id = %L$f$, public.t_rich(), public.t_xid(1))), 'TS002', 'restoring the original payload onto a tombstone is rejected (TS002)');
select is(public.t_state(format($f$update public.user_outings set payload = %L::jsonb where id = %L$f$, '{"name":{"en":"x"},"stopIds":[],"answers":{}}', public.t_xid(1))), 'TS002', 'any other payload edit is rejected (TS002)');
select is(public.t_state(format('update public.user_outings set schema_version = 1 where id = %L', public.t_xid(1))), 'TS002', 'a schema_version edit is rejected (TS002)');
select is(public.t_state(format('update public.user_outings set deleted_at = now() where id = %L', public.t_xid(1))), 'TS002', 'a second tombstone update is rejected (TS002)');
select is(public.t_state(format('update public.user_outings set payload = payload where id = %L', public.t_xid(1))), 'TS002', 'even a no-op UPDATE is rejected (TS002)');
select is(public.t_state(format($f$insert into public.user_outings (id, schema_version, payload) values (%L, 1, %L::jsonb) on conflict (id) do update set payload = excluded.payload$f$, public.t_xid(1), public.t_rich())),
  'TS002', 'a merge-upsert (DO UPDATE) onto her own tombstone is rejected (TS002)');
select is(public.t_state(format($f$insert into public.user_outings (id, schema_version, payload, deleted_at) values (%L, 1, %L::jsonb, now())$f$, public.t_xid(90), public.t_scrub())), 'TS002',
  'an INSERT that names a non-null deleted_at is rejected (no pre-tombstoned outing)');
select is((select payload from public.user_outings where id = public.t_xid(1)), public.t_scrub(), 'after all of that the tombstone is exactly as it was');
select public.t_as('authenticated', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select is(public.t_state(format($f$insert into public.user_outings (id, schema_version, payload) values (%L, 1, %L::jsonb)$f$, public.t_xid(1), public.t_rich())), '23505',
  'another user cannot reuse a tombstoned UUID');
select public.t_as('service_role', null);
select is(public.t_state(format($f$update public.user_outings set payload = %L::jsonb where id = %L$f$, public.t_rich(), public.t_xid(1))), 'TS002', 'service_role cannot restore the payload either (TS002)');
select is(public.t_state(format('update public.user_outings set deleted_at = null where id = %L', public.t_xid(1))), 'TS002', 'service_role cannot clear deleted_at (TS002)');
select is(public.t_state(format($f$insert into public.user_outings (id, user_id, schema_version, payload, deleted_at) values (%L, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, %L::jsonb, now())$f$, public.t_xid(91), public.t_scrub())),
  'TS002', 'service_role cannot create a pre-tombstoned outing (TS002)');
select is(public.t_state(format('delete from public.user_outings where id = %L', public.t_xid(2))), '42501', 'service_role cannot physically DELETE an outing');
select is(public.t_state(format($f$update public.user_outings set payload = %L::jsonb where id = %L$f$, '{"name":{"en":"svc edit"},"stopIds":[],"answers":{}}', public.t_xid(2))), 'OK', 'service_role can still UPDATE a live outing');

-- ── G. privileges in action, RLS ───────────────────────────────────────────────
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state(format('delete from public.user_outings where id = %L', public.t_xid(2))), '42501', 'authenticated cannot physically DELETE even her own live outing');
select is(public.t_state('delete from public.user_outings'), '42501', 'nor delete all of them');
select is(public.t_state(format($f$update public.user_outings set updated_at = '2001-01-01' where id = %L$f$, public.t_xid(2))), '42501', 'a client still cannot write updated_at');
select is(public.t_state(format($f$update public.user_outings set payload = %L::jsonb where id = %L$f$, '{"name":{"en":"Edited"},"stopIds":["BLK-0009"],"answers":{}}', public.t_xid(2))), 'OK', 'a live payload edit still works');
select is(public.t_rows(format('update public.user_outings set deleted_at = now() where id = %L', public.t_xid(3))), 0, 'A cannot tombstone B''s outing (zero rows)');
select public.t_as('authenticated', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select is((select deleted_at from public.user_outings where id = public.t_xid(3)), null::timestamptz, 'B''s outing is still live');
select is((select count(*)::int from public.user_outings where id = public.t_xid(1)), 0, 'B cannot read A''s tombstone');
select is(public.t_rows(format('update public.user_outings set deleted_at = now() where id = %L', public.t_xid(3))), 1, 'B can tombstone her own outing');
select is((select payload from public.user_outings where id = public.t_xid(3)), public.t_scrub(), '...and it is scrubbed');
select public.t_as('anon', null);
select is(public.t_state('select count(*) from public.user_outings'), '42501', 'anon cannot read outings');
select is(public.t_state(format('update public.user_outings set deleted_at = now() where id = %L', public.t_xid(2))), '42501', 'anon cannot request a tombstone');
select is(public.t_state(format('delete from public.user_outings where id = %L', public.t_xid(2))), '42501', 'anon cannot DELETE');

-- ── H. distinct responsibilities: the guard and set_updated_at do not depend on each other ──
reset role;
insert into public.user_outings (id, user_id, schema_version, payload) values
  (public.t_xid(10), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, public.t_rich()),
  (public.t_xid(11), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, public.t_rich()),
  (public.t_xid(12), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, public.t_rich());
select public.t_backdate_o(public.t_xid(10));
select public.t_backdate_o(public.t_xid(11));
select public.t_backdate_o(public.t_xid(12));
alter table public.user_outings disable trigger set_updated_at;
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_rows(format('update public.user_outings set deleted_at = now() where id = %L', public.t_xid(10))), 1, 'with set_updated_at switched off, a tombstone request still works...');
reset role;
select is((select deleted_at = now() and payload = public.t_scrub() and schema_version = 1 from public.user_outings where id = public.t_xid(10)), true, '...the guard alone stamps deleted_at and scrubs the payload');
select is((select updated_at from public.user_outings where id = public.t_xid(10)), '2000-01-01'::timestamptz, '...and does not touch updated_at');
alter table public.user_outings enable trigger set_updated_at;
alter table public.user_outings disable trigger user_outings_tombstone_guard;
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state(format($f$update public.user_outings set payload = %L::jsonb where id = %L$f$, '{"name":{"en":"Edited again"},"stopIds":[],"answers":{}}', public.t_xid(11))), 'OK', 'with the guard switched off, a live edit works...');
reset role;
select is((select updated_at from public.user_outings where id = public.t_xid(11)), now(), '...and set_updated_at alone moves updated_at');
-- the at-rest CHECK is the second line of defence: without the guard a tombstone request that is not scrubbed is refused
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state(format('update public.user_outings set deleted_at = now() where id = %L', public.t_xid(12))), '23514',
  'with the guard switched off the scrub CHECK still refuses a tombstone that holds the original payload (23514)');
reset role;
alter table public.user_outings enable trigger user_outings_tombstone_guard;

-- ── I. account deletion removes live outings and tombstones ───────────────────
insert into auth.users (id) values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
insert into public.user_outings (id, user_id, schema_version, payload) values
  (public.t_xid(40), 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 1, public.t_rich()),
  (public.t_xid(41), 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 1, public.t_rich()),
  (public.t_xid(42), 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 1, public.t_rich()),
  (public.t_xid(43), 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 1, public.t_rich());
select public.t_as('authenticated', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
select is(public.t_rows(format('update public.user_outings set deleted_at = now() where id = %L', public.t_xid(41))), 1, 'user D tombstones one outing');
select public.t_as('authenticated', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
select is(public.t_rows(format('update public.user_outings set deleted_at = now() where id = %L', public.t_xid(43))), 1, 'user E tombstones one outing');
reset role;
select is((select count(*)::int from public.user_outings where user_id in ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') and deleted_at is not null), 2,
  'precondition: two tombstones and two live outings exist');
-- (that role cannot see the pgTAP schema, so its result is captured and asserted after the role is reset)
set local role supabase_auth_admin;
select public.t_state($q$delete from auth.users where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'$q$) as auth_admin_delete \gset
reset role;
select is(:'auth_admin_delete'::text, 'OK'::text, 'the auth admin role deletes user D (the cascade does not depend on client DELETE privileges)');
delete from auth.users where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
select is((select count(*)::int from public.user_outings where user_id in ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')), 0,
  'account deletion removed the live outings and the tombstones');
select is((select count(*)::int from public.user_outings where id in (public.t_xid(41), public.t_xid(43))), 0, 'no tombstone survives account deletion');
select is((select count(*)::int from public.user_outings where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 1, 'another user''s outing (her own tombstone) is untouched');

select * from finish();
rollback;
