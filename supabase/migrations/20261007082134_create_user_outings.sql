-- Saved outings for authenticated users (Phase 2 account sync).
--
-- Design notes:
--   • user_outings is the canonical FUTURE synchronized outing store. The legacy
--     web-local outing shape (title, summary, budget, withWho, ...) stays local and
--     unsynced; a later explicit task converts it into the canonical format. There
--     is ONE payload lineage: schema_version = 1 is the current mobile sync model,
--     and future versions evolve it through forward migrations.
--   • id is the CLIENT-GENERATED secure UUID, the true entity identity (same locally
--     and remotely). NO default on purpose: a missing id must fail.
--   • The outing is stored as a versioned JSONB payload (not structured columns) so
--     the format can evolve without a table migration per change. The envelope
--     (id, user_id, schema_version, timestamps) stays relational.
--   • schema_version = 1 is the only accepted version for now. Rejecting other
--     versions closes the loophole where an unknown version would bypass shape
--     validation. A future v2 is introduced by a forward migration that replaces the
--     two CHECK constraints below.
--   • Version 1 payload (see docs/database/sync-schema.md):
--       {
--         "name":    { "en": "<text>", "fr": "<text>" (optional) },
--         "why":     { "en": "<text>", "fr": "<text>" (optional) }   -- optional key
--         "stopIds": [ "BLK-0001", ... ]                            -- 0..4 canonical ids
--         "answers": { ... }                                        -- JSON object
--       }
--     These four are the ONLY top-level keys version 1 accepts (name, stopIds and
--     answers are required; why is optional). Any other top-level key is rejected,
--     including price, budget or duration: version 1 has exactly one meaning, and a
--     new field must arrive with a new schema_version through a forward migration.
--     No price or budget field exists. The contents of "answers" are the clients'
--     planner contract and are not enumerated by the database.
--   • Size guard: 32768 bytes of the serialized payload. The largest valid outing the
--     current planner can produce is about 0.4 KB (4 stops, the longest area name,
--     both languages), so the guard is ~75x headroom and exists only to bound abuse.
--   • created_at is client-supplied (the local createdAt survives upload);
--     updated_at is SERVER-CONTROLLED: public.set_updated_at() runs BEFORE INSERT OR
--     UPDATE, so a value a client supplies on INSERT is overwritten.
--   • Hard delete only. SYNC-GATE-1 (docs/database/sync-schema.md): no client sync
--     may ship until deletion propagation for collections and outings is resolved.
--
-- Privilege posture (the live postgres default ACLs grant REFERENCES, TRIGGER,
-- TRUNCATE and MAINTAIN on new public tables; none is relied upon):
--   anon            nothing (no grants, no policies)
--   authenticated   SELECT, INSERT, DELETE, UPDATE (schema_version, payload) own rows
--   service_role    SELECT, INSERT, UPDATE, DELETE (bypasses RLS)

-- ── Version-1 shape validator ──────────────────────────────────────────────────
--
-- A CHECK constraint evaluates this with the privileges of the writing role, which
-- therefore needs EXECUTE (proved in supabase/local-db-tests/sync-schema/00_semantics.test.sql).
-- Narrowly scoped to outing schema v1; not a generic JSON-schema facility.
--   IMMUTABLE         depends only on its argument
--   SECURITY INVOKER  reads nothing but its argument
--   search_path = ''  every non-pg_catalog name is schema-qualified

create function public.is_valid_outing_payload_v1(p jsonb)
  returns boolean
  language plpgsql
  immutable
  security invoker
  set search_path = ''
as $$
declare
  loc   jsonb;
  stops jsonb;
  stop  jsonb;
  k     text;
begin
  -- an object that carries the three required keys
  if p is null or pg_catalog.jsonb_typeof(p) <> 'object' then
    return false;
  end if;
  if not (p ? 'name' and p ? 'stopIds' and p ? 'answers') then
    return false;
  end if;

  -- No other top-level key is part of version 1 (price, budget, duration, anything undeclared).
  for k in select key from pg_catalog.jsonb_object_keys(p) as key loop
    if k not in ('name', 'why', 'stopIds', 'answers') then
      return false;
    end if;
  end loop;

  -- name (required) and why (optional): { "en": text, "fr"?: text }
  foreach loc in array array[p -> 'name', p -> 'why'] loop
    if loc is not null then
      if pg_catalog.jsonb_typeof(loc) <> 'object'
         or pg_catalog.jsonb_typeof(loc -> 'en') is distinct from 'string'
         or (loc ? 'fr' and pg_catalog.jsonb_typeof(loc -> 'fr') is distinct from 'string') then
        return false;
      end if;
    end if;
  end loop;

  -- stopIds: an array of at most 4 canonical BLK ids (the planner's largest outing)
  stops := p -> 'stopIds';
  if pg_catalog.jsonb_typeof(stops) <> 'array' then
    return false;
  end if;
  if pg_catalog.jsonb_array_length(stops) > 4 then
    return false;
  end if;
  for stop in select e from pg_catalog.jsonb_array_elements(stops) as e loop
    if pg_catalog.jsonb_typeof(stop) <> 'string' or (stop #>> '{}') !~ '^BLK-[0-9]{4}$' then
      return false;
    end if;
  end loop;

  -- answers: a JSON object (its planner keys are the client's contract)
  if pg_catalog.jsonb_typeof(p -> 'answers') <> 'object' then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.is_valid_outing_payload_v1(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.is_valid_outing_payload_v1(jsonb) to authenticated, service_role;

comment on function public.is_valid_outing_payload_v1(jsonb) is
  'Structural validator for user_outings payloads of schema_version 1 (mobile sync model). Used only by CHECK constraints.';

-- ── Table ──────────────────────────────────────────────────────────────────────

create table public.user_outings (
  id             uuid        primary key,
  user_id        uuid        not null default auth.uid()
                             references auth.users (id) on delete cascade,
  schema_version smallint    not null,
  payload        jsonb       not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint user_outings_schema_version_known check (schema_version = 1),
  constraint user_outings_payload_size_guard check (octet_length(payload::text) <= 32768),
  constraint user_outings_payload_valid_v1 check (public.is_valid_outing_payload_v1(payload))
);

-- Newest-first listing for one user.
create index user_outings_user_created_at_idx
  on public.user_outings (user_id, created_at desc);

-- ── RLS + privileges ───────────────────────────────────────────────────────────

alter table public.user_outings enable row level security;

revoke all on table public.user_outings from anon;
revoke all on table public.user_outings from authenticated;
revoke all on table public.user_outings from service_role;

grant select, insert, delete on table public.user_outings to authenticated;
-- Column-level: id, user_id and created_at are immutable for clients.
grant update (schema_version, payload) on table public.user_outings to authenticated;
grant select, insert, update, delete on table public.user_outings to service_role;

create policy "authenticated users can select own outings"
  on public.user_outings
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "authenticated users can insert own outings"
  on public.user_outings
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "authenticated users can update own outings"
  on public.user_outings
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "authenticated users can delete own outings"
  on public.user_outings
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- INSERT as well as UPDATE: a client may name updated_at in an INSERT, and the server value wins.
create trigger set_updated_at
  before insert or update on public.user_outings
  for each row
  execute function public.set_updated_at();

comment on table public.user_outings is
  'Account-sync outings: versioned JSONB payload. id is the client-generated UUID (no default). schema_version 1 = mobile sync model. See docs/database/sync-schema.md.';
