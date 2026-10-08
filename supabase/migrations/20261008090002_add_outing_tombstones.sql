-- Outing tombstones (Phase 3A-4B): deletion propagation for outings.
--
-- Second half of SYNC-GATE-1 (docs/database/sync-schema.md); the collection half is
-- 20261008090000_add_collection_tombstones.sql. This migration changes ONLY user_outings.
-- Neither migration is applied to production yet, so the gate stays closed until both are reviewed,
-- merged and applied and verified there, and the client reconciliation exists.
--
-- What changes
--   • user_outings gains deleted_at (timestamptz, nullable, no default). NULL = live.
--   • Deleting an outing is no longer a physical DELETE. A client asks for it by setting deleted_at on
--     its own row; in ONE statement the server:
--       1. replaces the requested value with its own transaction time,
--       2. forces schema_version = 1 and overwrites the payload with exactly
--            {"name": {"en": "Deleted outing"}, "stopIds": [], "answers": {}}
--          (no name, why, stop id or planner answer of the original survives),
--       3. lets set_updated_at() move updated_at (unchanged trigger).
--     The row stays under its original UUID until the account is deleted (no purge), so a device that
--     was offline can still tell "deleted" from "never synchronized".
--   • A tombstone is PERMANENT: deleted_at can never return to NULL, no column of a tombstoned row can
--     be updated again (not even by a no-op UPDATE), and the UUID can never be re-used (the primary-key
--     row stays). The original payload can never be restored onto that row.
--   • Clients (and service_role) lose DELETE on user_outings; the DELETE policy is dropped.
--
-- Custom SQLSTATE
--   TS002  a tombstone rule was violated. This is the same generic contract the collection migration
--          defined (editing a tombstone, clearing deleted_at, creating a row that is already deleted),
--          so it is reused rather than inventing a second code for the identical condition.
--
-- Function posture
--   One new trigger function, SECURITY INVOKER with search_path = '' and no dynamic SQL, like
--   set_updated_at(). It needs no elevated rights: it only assigns to NEW or raises. There is NO new
--   SECURITY DEFINER function. EXECUTE is revoked from every client role (a trigger function cannot be
--   called directly anyway, and PostgreSQL checks EXECUTE when a trigger is created, not when it fires).
--
-- Trigger interaction
--   user_outings already has set_updated_at (BEFORE INSERT OR UPDATE). The two BEFORE triggers write
--   DISJOINT columns: the guard writes deleted_at, schema_version and payload (and rejects); set_updated_at
--   writes only updated_at. The guard never reads updated_at, so the order in which PostgreSQL fires
--   them (alphabetical by name) does not matter for correctness.
--
-- Validators keep applying
--   The scrub payload is itself a valid version-1 payload, so the existing CHECKs (schema_version = 1,
--   the 32768-byte size guard and is_valid_outing_payload_v1) still run on a tombstone. None is weakened.
--
-- Optimistic concurrency
--   A single row's UPDATE takes its row lock; a stale conditional tombstone
--   (... WHERE id = ? AND updated_at = <baseline> AND deleted_at IS NULL) waits for a concurrent edit and
--   then re-evaluates its filter against the new row, affecting zero rows. An outing has no child rows, so
--   no extra locking is needed (unlike collections).
--
-- Privilege posture after this migration
--   authenticated   user_outings: SELECT, INSERT, UPDATE (schema_version, payload, deleted_at); NO DELETE
--   service_role    user_outings: SELECT, INSERT, UPDATE; NO DELETE
--   anon            nothing (unchanged)
--   Account deletion still removes every row: the foreign-key cascade from auth.users runs with the
--   table owner's rights, not the client's.

-- ── 1. deleted_at and the at-rest scrub invariant ──────────────────────────────

alter table public.user_outings
  add column deleted_at timestamptz;

-- Belt and braces next to the trigger: a tombstoned row can only hold the scrub content. The existing
-- schema_version, size and shape CHECKs are untouched and still apply to it.
alter table public.user_outings
  add constraint user_outings_tombstone_scrubbed
  check (
    deleted_at is null
    or (
      schema_version = 1
      and payload = '{"name": {"en": "Deleted outing"}, "stopIds": [], "answers": {}}'::jsonb
    )
  );

comment on column public.user_outings.deleted_at is
  'NULL = live. Set once by the server (transaction time) when the owner requests deletion; never cleared. See docs/database/sync-schema.md.';

-- ── 2. tombstone guard (INSERT and UPDATE) ─────────────────────────────────────

create function public.user_outings_tombstone_guard()
  returns trigger
  language plpgsql
  security invoker
  set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.deleted_at is not null then
      raise exception 'an outing cannot be created already deleted'
        using errcode = 'TS002';
    end if;
    return new;
  end if;

  -- UPDATE
  if old.deleted_at is not null then
    raise exception 'a deleted outing cannot be changed'
      using errcode = 'TS002';
  end if;

  if new.deleted_at is not null then
    -- LIVE -> TOMBSTONE: whatever the client sent, the server decides the time and the content.
    new.deleted_at := pg_catalog.now();
    new.schema_version := 1;
    new.payload := '{"name": {"en": "Deleted outing"}, "stopIds": [], "answers": {}}'::jsonb;
  end if;
  return new;
end;
$$;

revoke all on function public.user_outings_tombstone_guard() from public, anon, authenticated, service_role;

comment on function public.user_outings_tombstone_guard() is
  'BEFORE INSERT OR UPDATE trigger function on user_outings: creates no pre-deleted rows, makes tombstones permanent and scrubbed, stamps deleted_at with server time.';

create trigger user_outings_tombstone_guard
  before insert or update on public.user_outings
  for each row
  execute function public.user_outings_tombstone_guard();

-- ── 3. privileges and policy ───────────────────────────────────────────────────

revoke delete on table public.user_outings from authenticated;
revoke delete on table public.user_outings from service_role;
-- schema_version and payload were already updatable; deleted_at is the tombstone request.
-- updated_at stays server-only.
grant update (deleted_at) on table public.user_outings to authenticated;

-- With no DELETE privilege the policy would be dead code; dropping it also keeps RLS default-deny for
-- DELETE even if a grant were ever re-added by mistake.
drop policy "authenticated users can delete own outings" on public.user_outings;

comment on table public.user_outings is
  'Account-sync outings: versioned JSONB payload. id is the client-generated UUID (no default). schema_version 1 = mobile sync model. deleted_at marks a permanent, scrubbed tombstone. See docs/database/sync-schema.md.';
