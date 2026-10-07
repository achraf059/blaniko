-- Collections and their venue memberships for authenticated users (Phase 2 account sync).
--
-- Design notes:
--   • user_collections.id is the CLIENT-GENERATED secure UUID and is the true
--     entity identity, identical locally and remotely. It has NO default on
--     purpose: a missing id must fail, so a server-invented id can never diverge
--     from the id a device already holds. It is globally unique (primary key), so
--     ids cannot collide across users and the upsert conflict target is `id`.
--   • UNIQUE (id, user_id) is technically redundant with the primary key. It
--     exists only because the composite foreign key below needs a unique target.
--   • OWNERSHIP IS ENFORCED BY THE DATABASE, not only by the UI:
--       foreign key (collection_id, user_id) -> user_collections (id, user_id)
--     together with RLS (select auth.uid()) = user_id makes both attacks fail:
--       A inserts an item into B's collection with user_id = A  -> no (collection, A) row: FK violation
--       A supplies user_id = B                                  -> RLS with check fails
--   • Items hold the canonical BLK venue id as text, with NO foreign key to
--     public.venues (canonical ids must survive venue replacement).
--   • Collection names are NOT unique: two offline devices both create
--     "New collection 1", and migrated mobile data keeps duplicate names. Names
--     must be non-blank (not empty and not only ASCII whitespace). No product limit
--     exists today (mobile has no rename and the web enforces none), so the
--     1000-character cap is a documented ABUSE GUARD only, deliberately generous and
--     easy to relax; it is not a product rule.
--   • Creating is INSERT ... ON CONFLICT (id) DO NOTHING; renaming is a PATCH of
--     `name`. A merge-upsert (DO UPDATE) is not supported because id, user_id and
--     created_at are immutable for clients (column-level UPDATE grant below).
--   • created_at / added_at are client-supplied (the mobile timestamps survive
--     upload). updated_at is SERVER-CONTROLLED: public.set_updated_at() runs BEFORE
--     INSERT OR UPDATE, so a value a client supplies on INSERT is overwritten.
--   • Hard delete only. SYNC-GATE-1 (docs/database/sync-schema.md): no client sync
--     may ship until deletion propagation for collections and outings is resolved.
--
-- Privilege posture (the live postgres default ACLs grant REFERENCES, TRIGGER,
-- TRUNCATE and MAINTAIN on new public tables; none is relied upon):
--   anon            nothing (no grants, no policies)
--   authenticated   collections: SELECT, INSERT, DELETE, UPDATE (name) own rows;
--                   items: SELECT, INSERT, DELETE own rows
--   service_role    SELECT, INSERT, UPDATE, DELETE (bypasses RLS)

-- ── user_collections ───────────────────────────────────────────────────────────

create table public.user_collections (
  id         uuid        primary key,
  user_id    uuid        not null default auth.uid()
                         references auth.users (id) on delete cascade,
  name       text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_collections_id_user_id_key unique (id, user_id),
  -- Not blank: at least one character that is not ASCII whitespace. (btrim() alone trims only
  -- spaces, so a name made of tabs or newlines would pass it.)
  constraint user_collections_name_not_blank check (name !~ '^[[:space:]]*$'),
  constraint user_collections_name_abuse_guard check (char_length(name) <= 1000)
);

create index user_collections_user_created_at_idx
  on public.user_collections (user_id, created_at);

alter table public.user_collections enable row level security;

revoke all on table public.user_collections from anon;
revoke all on table public.user_collections from authenticated;
revoke all on table public.user_collections from service_role;

grant select, insert, delete on table public.user_collections to authenticated;
-- Column-level: only the name is mutable for clients (id, user_id, created_at are immutable;
-- updated_at is written by the trigger, which is not subject to the statement's column list).
grant update (name) on table public.user_collections to authenticated;
grant select, insert, update, delete on table public.user_collections to service_role;

create policy "authenticated users can select own collections"
  on public.user_collections
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "authenticated users can insert own collections"
  on public.user_collections
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "authenticated users can update own collections"
  on public.user_collections
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "authenticated users can delete own collections"
  on public.user_collections
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- INSERT as well as UPDATE: a client may name updated_at in an INSERT, and the server value wins.
create trigger set_updated_at
  before insert or update on public.user_collections
  for each row
  execute function public.set_updated_at();

comment on table public.user_collections is
  'Account-sync collections. id is the client-generated UUID (no default). See docs/database/sync-schema.md.';

-- ── user_collection_items ──────────────────────────────────────────────────────

create table public.user_collection_items (
  collection_id uuid        not null,
  user_id       uuid        not null default auth.uid(),
  venue_id      text        not null,
  added_at      timestamptz not null default now(),
  constraint user_collection_items_pkey primary key (collection_id, venue_id),
  -- Ownership integrity: the item's user must own the collection. No direct
  -- auth.users foreign key is needed: deleting an account cascades through the
  -- collection (auth.users -> user_collections -> items).
  constraint user_collection_items_collection_fkey
    foreign key (collection_id, user_id)
    references public.user_collections (id, user_id)
    on delete cascade,
  constraint user_collection_items_venue_id_format check (venue_id ~ '^BLK-[0-9]{4}$')
);

-- "Which of my collections contain this venue?"
create index user_collection_items_user_venue_idx
  on public.user_collection_items (user_id, venue_id);

alter table public.user_collection_items enable row level security;

revoke all on table public.user_collection_items from anon;
revoke all on table public.user_collection_items from authenticated;
revoke all on table public.user_collection_items from service_role;

-- No UPDATE for clients: no column of an item is mutable.
grant select, insert, delete on table public.user_collection_items to authenticated;
grant select, insert, update, delete on table public.user_collection_items to service_role;

create policy "authenticated users can select own collection items"
  on public.user_collection_items
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "authenticated users can insert own collection items"
  on public.user_collection_items
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "authenticated users can delete own collection items"
  on public.user_collection_items
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.user_collection_items is
  'Account-sync collection memberships by canonical BLK id. Composite FK enforces collection ownership. No FK to venues by design.';
