-- Collection tombstones (Phase 3A-4A): deletion propagation for collections and their items.
--
-- Resolves the COLLECTION half of SYNC-GATE-1 (docs/database/sync-schema.md). Outings are NOT
-- changed here: their tombstones arrive in a separate migration, so the gate stays closed until then.
--
-- What changes
--   • user_collections gains deleted_at (timestamptz, nullable, no default). NULL = live.
--   • Deleting a collection is no longer a physical DELETE. A client asks for it by setting
--     deleted_at on its own row; the server then, in ONE transaction:
--       1. replaces the requested value with its own transaction time,
--       2. scrubs the name to exactly 'Deleted collection',
--       3. lets set_updated_at() move updated_at (unchanged trigger),
--       4. physically deletes every item of the collection.
--     The row stays under its original UUID until the account is deleted (no purge), so a device
--     that was offline can still tell "deleted" from "never synchronized".
--   • A tombstone is PERMANENT: deleted_at can never return to NULL, no column of a tombstoned row
--     can be updated again, and the UUID can never be re-used (the primary-key row stays).
--   • A tombstoned collection accepts no new item (custom SQLSTATE TS001).
--   • Every successful item INSERT or DELETE on a LIVE collection moves that collection's
--     updated_at (once per statement per collection), so membership changes are visible as a
--     parent revision and a stale conditional tombstone cannot silently destroy unseen items.
--   • Clients (and service_role) lose DELETE on user_collections; the DELETE policy is dropped.
--   • user_collection_items becomes an IMMUTABLE relationship table for every role: service_role loses
--     UPDATE (authenticated never had it). A membership change is only ever an INSERT or a DELETE, so
--     every supported change passes the parent live/tombstone guard, the parent lock and the revision
--     bump. Without this, UPDATE of collection_id / user_id / venue_id could re-parent an item (for
--     example under a tombstoned collection) without passing any of them. No backend path updates items.
--
-- Custom SQLSTATEs (client-visible contract; the first character T is outside the SQL-standard
-- reserved range 0-4 / A-H, and class TS is not used by PostgreSQL)
--   TS001  the parent collection is tombstoned (an item cannot be added to it)
--   TS002  a tombstone rule was violated (editing a tombstoned collection, clearing deleted_at,
--          or creating a collection that is already deleted)
--
-- Function posture
--   Three of the five trigger functions (tombstone guard, child purge, parent lock) are SECURITY INVOKER with
--   search_path = '' (like set_updated_at): they read and write only what the calling role may already read and write.
--   The two revision-bump functions are the ONLY SECURITY DEFINER functions, because a client has
--   (and must never receive) no UPDATE privilege on updated_at:
--     • owner postgres (the migration role), search_path = '', no dynamic SQL;
--     • each is a STATEMENT-level AFTER trigger function bound to user_collection_items and checks
--       that it is being run as exactly that trigger;
--     • each updates ONLY user_collections.updated_at of LIVE parents whose (id, user_id) appears
--       in the transition table of the item statement that just succeeded, so the set of
--       collections it can touch is exactly the set the caller's RLS-checked and FK-checked item
--       mutation already addressed (an item can only name a collection owned by its own user:
--       composite foreign key);
--     • EXECUTE is revoked from every client role. A trigger function cannot be called directly
--       anyway, and PostgreSQL checks EXECUTE when a trigger is created, not when it fires.
--
-- Locking (why FOR NO KEY UPDATE)
--   The foreign key from an item to its collection takes only FOR KEY SHARE on the parent, which
--   does NOT conflict with the tombstone UPDATE (FOR NO KEY UPDATE). Without more, an item INSERT
--   could commit while the collection is being tombstoned. A BEFORE ROW trigger on items therefore
--   locks the exact parent row FOR NO KEY UPDATE first. Every writer (item insert, item delete,
--   tombstone) takes the parent lock BEFORE any item row, so there is one lock order. Under READ
--   COMMITTED a waiting writer re-reads the parent after the other transaction commits.
--
-- Privilege posture after this migration
--   authenticated   user_collections: SELECT, INSERT, UPDATE (name, deleted_at); NO DELETE
--                   user_collection_items: SELECT, INSERT, DELETE (unchanged)
--   service_role    user_collections: SELECT, INSERT, UPDATE; NO DELETE
--                   user_collection_items: SELECT, INSERT, DELETE; NO UPDATE
--   anon            nothing (unchanged)
--   Account deletion still removes every row: the foreign-key cascade from auth.users runs with
--   the table owner's rights, not the client's.

-- ── 1. deleted_at and the at-rest scrub invariant ──────────────────────────────

alter table public.user_collections
  add column deleted_at timestamptz;

-- Belt and braces next to the trigger: a tombstoned row can only hold the neutral name.
alter table public.user_collections
  add constraint user_collections_tombstone_scrubbed
  check (deleted_at is null or name = 'Deleted collection');

comment on column public.user_collections.deleted_at is
  'NULL = live. Set once by the server (transaction time) when the owner requests deletion; never cleared. See docs/database/sync-schema.md.';

-- ── 2. tombstone guard (collections: INSERT and UPDATE) ────────────────────────
--
-- One responsibility: deleted_at + scrub + immutability. It does not touch updated_at (that is
-- set_updated_at()'s job), so the two BEFORE triggers write disjoint columns and their relative
-- order does not matter.

create function public.user_collections_tombstone_guard()
  returns trigger
  language plpgsql
  security invoker
  set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.deleted_at is not null then
      raise exception 'a collection cannot be created already deleted'
        using errcode = 'TS002';
    end if;
    return new;
  end if;

  -- UPDATE
  if old.deleted_at is not null then
    raise exception 'a deleted collection cannot be changed'
      using errcode = 'TS002';
  end if;

  if new.deleted_at is not null then
    -- LIVE -> TOMBSTONE: whatever the client sent, the server decides the time and the content.
    new.deleted_at := pg_catalog.now();
    new.name := 'Deleted collection';
  end if;
  return new;
end;
$$;

revoke all on function public.user_collections_tombstone_guard() from public, anon, authenticated, service_role;

comment on function public.user_collections_tombstone_guard() is
  'BEFORE INSERT OR UPDATE trigger function on user_collections: creates no pre-deleted rows, makes tombstones permanent and scrubbed, stamps deleted_at with server time.';

create trigger user_collections_tombstone_guard
  before insert or update on public.user_collections
  for each row
  execute function public.user_collections_tombstone_guard();

-- ── 3. child purge (collections: AFTER the LIVE -> TOMBSTONE update) ───────────
--
-- AFTER, not BEFORE: by now the parent row already shows deleted_at, so the item triggers below
-- see a tombstoned parent and do not try to bump it (a nested update of a row the same command is
-- still updating would also be an error). The purge runs in the tombstone statement's transaction:
-- if it fails, the tombstone fails with it.

create function public.user_collections_purge_items()
  returns trigger
  language plpgsql
  security invoker
  set search_path = ''
as $$
begin
  delete from public.user_collection_items i
   where i.collection_id = new.id
     and i.user_id = new.user_id;
  return null;
end;
$$;

revoke all on function public.user_collections_purge_items() from public, anon, authenticated, service_role;

comment on function public.user_collections_purge_items() is
  'AFTER UPDATE trigger function on user_collections: physically deletes the items of a collection that has just been tombstoned.';

create trigger user_collections_purge_items
  after update on public.user_collections
  for each row
  when (old.deleted_at is null and new.deleted_at is not null)
  execute function public.user_collections_purge_items();

-- ── 4. items: lock the parent, refuse a tombstoned parent ───────────────────────

create function public.user_collection_items_lock_parent()
  returns trigger
  language plpgsql
  security invoker
  set search_path = ''
as $$
declare
  parent_deleted_at timestamptz;
begin
  if tg_op = 'INSERT' then
    -- No deleted_at filter on purpose: after a concurrent tombstone commits, the waiting
    -- statement must SEE the tombstoned row, not "no row".
    select c.deleted_at
      into parent_deleted_at
      from public.user_collections c
     where c.id = new.collection_id
       and c.user_id = new.user_id
       for no key update;

    -- No visible parent: do nothing here; the composite foreign key (23503) or RLS (42501)
    -- reports the identity problem exactly as before.
    if found and parent_deleted_at is not null then
      raise exception 'the collection is deleted; items cannot be added to it'
        using errcode = 'TS001';
    end if;
    return new;
  end if;

  -- DELETE: take the same parent lock before the item row, so item deletion and collection
  -- tombstoning always lock in the same order (parent first). Nothing to check.
  perform 1
     from public.user_collections c
    where c.id = old.collection_id
      and c.user_id = old.user_id
      for no key update;
  return old;
end;
$$;

revoke all on function public.user_collection_items_lock_parent() from public, anon, authenticated, service_role;

comment on function public.user_collection_items_lock_parent() is
  'BEFORE INSERT OR DELETE row trigger function on user_collection_items: locks the parent collection FOR NO KEY UPDATE and refuses inserts under a tombstoned parent (TS001).';

create trigger user_collection_items_lock_parent
  before insert or delete on public.user_collection_items
  for each row
  execute function public.user_collection_items_lock_parent();

-- ── 5. items: bump the live parent's revision (SECURITY DEFINER, narrow) ────────
--
-- Security reasoning, in one place:
--   • Who can reach this code? Only a role whose own INSERT/DELETE on user_collection_items
--     succeeded (privilege, RLS and foreign key all passed). Nobody can call it: it is a trigger
--     function, and EXECUTE is revoked from PUBLIC, anon, authenticated and service_role.
--   • What can it change? Exactly one column, updated_at, of LIVE collections identified by
--     (id, user_id) pairs that come from the statement's transition table. It reads nothing else
--     and takes no input from the caller. The composite foreign key guarantees such a pair is the
--     item's own parent, owned by the item's user.
--   • Why DEFINER at all? A client has no UPDATE privilege on updated_at (it must not: the value is
--     server-controlled) and the alternatives (a no-op assignment to a column the client may
--     update, or a broader UPDATE grant) would widen the client's surface or rely on a side effect.
--   • search_path is empty and every name is schema-qualified; there is no dynamic SQL.
--   • The extra tg_* checks refuse to run if the function were ever attached anywhere else.
--   • The UPDATE it issues fires set_updated_at() (which sets updated_at) and the tombstone guard
--     (live -> live is allowed). The purge trigger's WHEN clause is false for it, so no loop.
--   • Tombstoned parents are never touched (deleted_at is null), which is also what stops the
--     tombstone-driven purge from "bumping" a parent that has just been deleted.

create function public.user_collection_items_bump_parent_on_insert()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if tg_when <> 'AFTER' or tg_level <> 'STATEMENT' or tg_op <> 'INSERT'
     or tg_table_schema <> 'public' or tg_table_name <> 'user_collection_items' then
    raise exception 'user_collection_items_bump_parent_on_insert() is an AFTER INSERT statement trigger function for public.user_collection_items only';
  end if;

  update public.user_collections c
     set updated_at = pg_catalog.now()
   where c.deleted_at is null
     and (c.id, c.user_id) in (select n.collection_id, n.user_id from inserted_items n);
  return null;
end;
$$;

create function public.user_collection_items_bump_parent_on_delete()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if tg_when <> 'AFTER' or tg_level <> 'STATEMENT' or tg_op <> 'DELETE'
     or tg_table_schema <> 'public' or tg_table_name <> 'user_collection_items' then
    raise exception 'user_collection_items_bump_parent_on_delete() is an AFTER DELETE statement trigger function for public.user_collection_items only';
  end if;

  update public.user_collections c
     set updated_at = pg_catalog.now()
   where c.deleted_at is null
     and (c.id, c.user_id) in (select o.collection_id, o.user_id from deleted_items o);
  return null;
end;
$$;

revoke all on function public.user_collection_items_bump_parent_on_insert() from public, anon, authenticated, service_role;
revoke all on function public.user_collection_items_bump_parent_on_delete() from public, anon, authenticated, service_role;

comment on function public.user_collection_items_bump_parent_on_insert() is
  'SECURITY DEFINER AFTER INSERT statement trigger function on user_collection_items: moves updated_at of the live parents named by the inserted rows. Touches nothing else.';
comment on function public.user_collection_items_bump_parent_on_delete() is
  'SECURITY DEFINER AFTER DELETE statement trigger function on user_collection_items: moves updated_at of the live parents named by the deleted rows. Touches nothing else.';

-- Transition tables: one statement, one bump per parent. A skipped ON CONFLICT DO NOTHING row is not
-- in the transition table, so a repeated (idempotent) insert does not move the revision.
create trigger user_collection_items_bump_parent_on_insert
  after insert on public.user_collection_items
  referencing new table as inserted_items
  for each statement
  execute function public.user_collection_items_bump_parent_on_insert();

create trigger user_collection_items_bump_parent_on_delete
  after delete on public.user_collection_items
  referencing old table as deleted_items
  for each statement
  execute function public.user_collection_items_bump_parent_on_delete();

-- ── 6. privileges and policy ───────────────────────────────────────────────────

revoke delete on table public.user_collections from authenticated;
revoke delete on table public.user_collections from service_role;
-- name was already updatable; deleted_at is the tombstone request. updated_at stays server-only.
grant update (deleted_at) on table public.user_collections to authenticated;

-- Items are immutable: membership changes are INSERT / DELETE only (see the header). authenticated never
-- had UPDATE on items; this removes the last role that did.
revoke update on table public.user_collection_items from service_role;

-- With no DELETE privilege the policy would be dead code; dropping it also keeps RLS default-deny
-- for DELETE even if a grant were ever re-added by mistake.
drop policy "authenticated users can delete own collections" on public.user_collections;

comment on table public.user_collections is
  'Account-sync collections. id is the client-generated UUID (no default). deleted_at marks a permanent, scrubbed tombstone. See docs/database/sync-schema.md.';
