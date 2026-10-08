-- user_outings: client-supplied UUID identity, canonical v1 payload validation, size guard,
-- immutability, isolation, anon and service_role.
-- Prepended by the runner with _helpers.sql.

-- test helpers (rolled back with the transaction) ---------------------------------
create function public.t_oid(n int) returns text language sql immutable
  as $$ select 'c0000000-0000-4000-8000-' || lpad(n::text, 12, '0') $$;

-- Inserts outing number n as the CURRENT role; returns 'OK' or the SQLSTATE.
create function public.t_ins(n int, ver int, payload text) returns text language sql
  as $$ select public.t_state(format(
    'insert into public.user_outings (id, schema_version, payload) values (%L, %s, %L::jsonb)',
    public.t_oid(n), ver, payload)) $$;

-- A valid payload whose serialized text is exactly 32768 bytes (+ extra).
create function public.t_big(extra int) returns jsonb language plpgsql as $$
declare base int;
begin
  base := octet_length(jsonb_build_object('name', jsonb_build_object('en', ''), 'stopIds', '[]'::jsonb, 'answers', '{}'::jsonb)::text);
  return jsonb_build_object('name', jsonb_build_object('en', repeat('x', 32768 - base + extra)),
                            'stopIds', '[]'::jsonb, 'answers', '{}'::jsonb);
end $$;

select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

-- ── identity ───────────────────────────────────────────────────────────────────
select is(public.t_ins(1, 1, '{"name":{"en":"The best match"},"why":{"en":"The strongest matches for your answers."},"stopIds":["BLK-0001","BLK-0002","BLK-0003"],"answers":{"who":"friends","mood":"active","time":"half","area":null}}'), 'OK',
  'a complete canonical v1 payload is accepted (user_id defaults to the caller)');
select is(public.t_state($q$insert into public.user_outings (schema_version, payload)
  values (1, '{"name":{"en":"x"},"stopIds":[],"answers":{}}')$q$), '23502', 'a missing id is rejected (there is no default)');
select is(public.t_ins(1, 1, '{"name":{"en":"x"},"stopIds":[],"answers":{}}'), '23505', 'a duplicate UUID is rejected');
select public.t_as('authenticated', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select is(public.t_ins(1, 1, '{"name":{"en":"x"},"stopIds":[],"answers":{}}'), '23505', 'another user cannot reuse the UUID (global uniqueness)');
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is(public.t_state(format('insert into public.user_outings (id, schema_version, payload, created_at) values (%L, 1, %L::jsonb, %L)',
  public.t_oid(2), '{"name":{"en":"x"},"stopIds":[],"answers":{}}', '2024-02-03T04:05:06Z')), 'OK', 'a client created_at is accepted');
select is((select created_at from public.user_outings where id = public.t_oid(2)::uuid), '2024-02-03T04:05:06Z'::timestamptz, 'and preserved');

-- ── schema_version ─────────────────────────────────────────────────────────────
select is(public.t_ins(3, 2, '{"name":{"en":"x"},"stopIds":[],"answers":{}}'), '23514', 'an unknown schema_version (2) is rejected: it must not bypass validation');
select is(public.t_ins(3, 0, '{"name":{"en":"x"},"stopIds":[],"answers":{}}'), '23514', 'schema_version 0 is rejected');
select is(public.t_state(format('insert into public.user_outings (id, schema_version, payload) values (%L, null, %L::jsonb)', public.t_oid(3), '{"name":{"en":"x"},"stopIds":[],"answers":{}}')), '23502', 'a NULL schema_version is rejected');

-- ── valid shapes ───────────────────────────────────────────────────────────────
select is(public.t_ins(4, 1, '{"name":{"en":"Mix it up","fr":"Mélange"},"stopIds":[],"answers":{}}'), 'OK', 'why is optional; zero stops and a French name are accepted');
select is(public.t_ins(5, 1, '{"name":{"en":"x"},"stopIds":["BLK-0001","BLK-0002","BLK-0003","BLK-0004"],"answers":{"area":"Maarif"}}'), 'OK', 'exactly 4 stops (the planner maximum) are accepted');
select is(public.t_ins(6, 1, '{"name":{"en":"x"},"why":{"en":"y","fr":"z"},"stopIds":["BLK-0001"],"answers":{}}'), 'OK', 'a present why object is accepted (all four canonical keys)');
select is(public.t_ins(8, 1, '{"name":{"en":"x"},"stopIds":["BLK-0001"],"answers":{"anything":"inside answers is the clients contract","nested":{"ok":true}}}'), 'OK',
  'arbitrary keys INSIDE answers are still accepted: only top-level keys are closed');
select is(public.t_ins(7, 1, '{"name":{"en":"x"},"stopIds":["BLK-0001"],"answers":{"who":"solo","mood":"playful","time":"short","area":null}}'), 'OK',
  'the payload needs no price, budget or any other field beyond the canonical ones');

-- ── unknown top-level keys are rejected (version 1 has exactly one meaning) ────
select is(public.t_ins(14, 1, '{"name":{"en":"x"},"stopIds":[],"answers":{},"price":100}'), '23514', 'a price key is rejected');
select is(public.t_ins(14, 1, '{"name":{"en":"x"},"stopIds":[],"answers":{},"budget":"low"}'), '23514', 'a budget key is rejected');
select is(public.t_ins(14, 1, '{"name":{"en":"x"},"stopIds":[],"answers":{},"duration":120}'), '23514', 'a duration key is rejected');
select is(public.t_ins(14, 1, '{"name":{"en":"x"},"stopIds":[],"answers":{},"randomField":true}'), '23514', 'an arbitrary unknown key is rejected');
select is(public.t_ins(14, 1, '{"name":{"en":"x"},"stopIds":[],"answers":{},"price":1,"budget":2,"duration":3,"randomField":4}'), '23514', 'several unknown keys are rejected together');
select is(public.t_ins(14, 1, '{"name":{"en":"x"},"why":{"en":"y"},"stopIds":["BLK-0001"],"answers":{},"futureKey":42}'), '23514', 'a future key beside a fully valid payload is rejected (a new field needs a new schema_version)');
select is(public.t_ins(14, 1, '{"Name":{"en":"x"},"name":{"en":"x"},"stopIds":[],"answers":{}}'), '23514', 'a differently cased duplicate of a canonical key is an unknown key');
select is(public.t_ins(14, 1, '{"name":{"en":"x"},"stopIds":[],"answers":{},"":1}'), '23514', 'an empty-string key is rejected');
select is(public.t_ins(14, 1, '{"name":{"en":"x"},"stopIds":[],"answers":{},"WHY":{"en":"y"}}'), '23514', 'WHY (wrong case) is not the optional why');
select is(public.t_state(format($f$update public.user_outings set payload = %L::jsonb where id = %L$f$,
  '{"name":{"en":"x"},"stopIds":[],"answers":{},"price":9}', public.t_oid(1))), '23514', 'an UPDATE cannot introduce an unknown key either');
select is(public.t_state(format($f$update public.user_outings set payload = payload || '{"budget":1}'::jsonb where id = %L$f$, public.t_oid(1))), '23514', 'nor can a jsonb concatenation append one');

-- ── missing required keys ──────────────────────────────────────────────────────
select is(public.t_ins(10, 1, '{"stopIds":[],"answers":{}}'), '23514', 'missing name is rejected');
select is(public.t_ins(10, 1, '{"name":{"en":"x"},"answers":{}}'), '23514', 'missing stopIds is rejected');
select is(public.t_ins(10, 1, '{"name":{"en":"x"},"stopIds":[]}'), '23514', 'missing answers is rejected');
select is(public.t_ins(10, 1, '{}'), '23514', 'an empty object is rejected');

-- ── wrong key types ────────────────────────────────────────────────────────────
select is(public.t_ins(11, 1, '{"name":"plain string","stopIds":[],"answers":{}}'), '23514', 'name as a string is rejected (must be {en, fr?})');
select is(public.t_ins(11, 1, '{"name":null,"stopIds":[],"answers":{}}'), '23514', 'name null is rejected');
select is(public.t_ins(11, 1, '{"name":{"fr":"x"},"stopIds":[],"answers":{}}'), '23514', 'name without en is rejected');
select is(public.t_ins(11, 1, '{"name":{"en":5},"stopIds":[],"answers":{}}'), '23514', 'name.en as a number is rejected');
select is(public.t_ins(11, 1, '{"name":{"en":"x","fr":5},"stopIds":[],"answers":{}}'), '23514', 'name.fr as a number is rejected');
select is(public.t_ins(11, 1, '{"name":{"en":"x"},"why":"text","stopIds":[],"answers":{}}'), '23514', 'why as a string is rejected');
select is(public.t_ins(11, 1, '{"name":{"en":"x"},"why":null,"stopIds":[],"answers":{}}'), '23514', 'why as JSON null is rejected (omit the key instead)');
select is(public.t_ins(11, 1, '{"name":{"en":"x"},"why":{"fr":"y"},"stopIds":[],"answers":{}}'), '23514', 'why without en is rejected');
select is(public.t_ins(11, 1, '{"name":{"en":"x"},"stopIds":"BLK-0001","answers":{}}'), '23514', 'stopIds as a string is rejected');
select is(public.t_ins(11, 1, '{"name":{"en":"x"},"stopIds":{"0":"BLK-0001"},"answers":{}}'), '23514', 'stopIds as an object is rejected');
select is(public.t_ins(11, 1, '{"name":{"en":"x"},"stopIds":[],"answers":[]}'), '23514', 'answers as an array is rejected');
select is(public.t_ins(11, 1, '{"name":{"en":"x"},"stopIds":[],"answers":"friends"}'), '23514', 'answers as a string is rejected');
select is(public.t_ins(11, 1, '{"name":{"en":"x"},"stopIds":[],"answers":null}'), '23514', 'answers null is rejected');

-- ── stop ids ───────────────────────────────────────────────────────────────────
select is(public.t_ins(12, 1, '{"name":{"en":"x"},"stopIds":["BLK-1"],"answers":{}}'), '23514', 'a malformed stop id is rejected');
select is(public.t_ins(12, 1, '{"name":{"en":"x"},"stopIds":["blk-0001"],"answers":{}}'), '23514', 'a lower-case stop id is rejected');
select is(public.t_ins(12, 1, '{"name":{"en":"x"},"stopIds":["BLK-0001","venue-slug"],"answers":{}}'), '23514', 'one bad id among good ones rejects the outing');
select is(public.t_ins(12, 1, '{"name":{"en":"x"},"stopIds":[1],"answers":{}}'), '23514', 'a numeric stop id is rejected');
select is(public.t_ins(12, 1, '{"name":{"en":"x"},"stopIds":[null],"answers":{}}'), '23514', 'a null stop id is rejected');
select is(public.t_ins(12, 1, '{"name":{"en":"x"},"stopIds":[["BLK-0001"]],"answers":{}}'), '23514', 'a nested array is rejected');
select is(public.t_ins(12, 1, '{"name":{"en":"x"},"stopIds":["BLK-0001","BLK-0002","BLK-0003","BLK-0004","BLK-0005"],"answers":{}}'), '23514', '5 stops exceed the planner maximum of 4');

-- ── non-object payloads ────────────────────────────────────────────────────────
select is(public.t_ins(13, 1, '[]'), '23514', 'an array payload is rejected');
select is(public.t_ins(13, 1, '"text"'), '23514', 'a string payload is rejected');
select is(public.t_ins(13, 1, '42'), '23514', 'a number payload is rejected');
select is(public.t_ins(13, 1, 'null'), '23514', 'a JSON null payload is rejected');
select is(public.t_state(format('insert into public.user_outings (id, schema_version, payload) values (%L, 1, null)', public.t_oid(13))), '23502', 'a SQL NULL payload is rejected');

-- ── size guard (32768 bytes of serialized text) ────────────────────────────────
select is(octet_length(public.t_big(0)::text), 32768, 'the boundary payload is exactly 32768 bytes');
select is(public.t_ins(20, 1, public.t_big(0)::text), 'OK', 'a valid payload of exactly 32768 bytes is accepted');
select is(public.t_ins(21, 1, public.t_big(1)::text), '23514', 'a valid payload of 32769 bytes is rejected');

-- ── updates: only schema_version and payload, and still validated ───────────────
select is(public.t_state(format($f$update public.user_outings set payload = %L::jsonb where id = %L$f$,
  '{"name":{"en":"renamed"},"stopIds":["BLK-0009"],"answers":{}}', public.t_oid(1))), 'OK', 'A can replace the payload of her outing with another valid one');
select is(public.t_state(format($f$update public.user_outings set payload = %L::jsonb where id = %L$f$, '{"name":"bad"}', public.t_oid(1))), '23514', 'an invalid payload cannot be written by an UPDATE');
select is(public.t_state(format($f$update public.user_outings set schema_version = 2 where id = %L$f$, public.t_oid(1))), '23514', 'schema_version cannot be moved to an unknown version');
select is(public.t_state(format($f$update public.user_outings set id = %L where id = %L$f$, public.t_oid(90), public.t_oid(1))), '42501', 'id cannot be updated');
select is(public.t_state(format($f$update public.user_outings set user_id = %L where id = %L$f$, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', public.t_oid(1))), '42501', 'user_id cannot be updated');
select is(public.t_state(format($f$update public.user_outings set created_at = now() where id = %L$f$, public.t_oid(1))), '42501', 'created_at cannot be updated');
select is(public.t_state(format($f$update public.user_outings set updated_at = now() where id = %L$f$, public.t_oid(1))), '42501', 'updated_at cannot be written by a client');

-- ── isolation ──────────────────────────────────────────────────────────────────
reset role;
insert into public.user_outings (id, user_id, schema_version, payload)
values (public.t_oid(50)::uuid, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 1, '{"name":{"en":"B outing"},"stopIds":[],"answers":{}}');
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select is((select count(*)::int from public.user_outings where id = public.t_oid(50)::uuid), 0, 'A cannot read B''s outing');
select is(public.t_state(format('insert into public.user_outings (id, user_id, schema_version, payload) values (%L, %L, 1, %L::jsonb)',
  public.t_oid(51), 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '{"name":{"en":"x"},"stopIds":[],"answers":{}}')), '42501', 'A cannot insert an outing owned by B');
select is(public.t_state(format($f$update public.user_outings set payload = %L::jsonb where id = %L$f$,
  '{"name":{"en":"hacked"},"stopIds":[],"answers":{}}', public.t_oid(50))), 'OK', 'A''s update of B''s outing matches no visible row');
select is(public.t_state(format('delete from public.user_outings where id = %L', public.t_oid(50))), '42501', 'A cannot physically DELETE an outing at all (Phase 3A: deletion is a tombstone), so B''s is out of reach');
reset role;
select is((select payload -> 'name' ->> 'en' from public.user_outings where id = public.t_oid(50)::uuid), 'B outing', 'B''s outing is intact');
select public.t_as('authenticated', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
-- Phase 2 asserted: A DELETEs her outing and it is gone. Clients can no longer physically delete an outing; deletion is a
-- tombstone (the row stays, scrubbed). Full tombstone coverage is in 31_outing_tombstones.test.sql.
select is(public.t_state(format('delete from public.user_outings where id = %L', public.t_oid(7))), '42501', 'A cannot hard-delete her own outing');
select is(public.t_state(format('update public.user_outings set deleted_at = now() where id = %L', public.t_oid(7))), 'OK', 'A deletes her outing (tombstone request)');
select is((select count(*)::int from public.user_outings where id = public.t_oid(7)::uuid and deleted_at is not null), 1, 'and it remains as a tombstone that she can still read');

-- ── anon ───────────────────────────────────────────────────────────────────────
select public.t_as('anon', null);
select is(public.t_state('select count(*) from public.user_outings'), '42501', 'anon cannot SELECT');
select is(public.t_ins(60, 1, '{"name":{"en":"x"},"stopIds":[],"answers":{}}'), '42501', 'anon cannot INSERT');
select is(public.t_state('delete from public.user_outings'), '42501', 'anon cannot DELETE');
select is(public.t_state('update public.user_outings set payload = payload'), '42501', 'anon cannot UPDATE');
select is(public.t_state('select public.is_valid_outing_payload_v1(''{}''::jsonb)'), '42501', 'anon cannot call the validator directly');

-- ── service_role ───────────────────────────────────────────────────────────────
select public.t_as('service_role', null);
select is(public.t_state(format('insert into public.user_outings (id, user_id, schema_version, payload) values (%L, %L, 1, %L::jsonb)',
  public.t_oid(70), 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '{"name":{"en":"svc"},"stopIds":[],"answers":{}}')), 'OK', 'service_role can INSERT for any user');
select is(public.t_state(format($f$update public.user_outings set payload = %L::jsonb where id = %L$f$,
  '{"name":{"en":"svc2"},"stopIds":[],"answers":{}}', public.t_oid(70))), 'OK', 'service_role can UPDATE');
select is(public.t_state(format($f$update public.user_outings set payload = %L::jsonb where id = %L$f$, '{"bad":true}', public.t_oid(70))), '23514', 'service_role is still subject to the CHECK constraints');
select is(public.t_state(format('delete from public.user_outings where id = %L', public.t_oid(70))), '42501', 'service_role can no longer physically DELETE an outing (Phase 3A)');
select is(public.t_state('truncate public.user_outings'), '42501', 'service_role cannot TRUNCATE');

reset role;
select * from finish();
rollback;
