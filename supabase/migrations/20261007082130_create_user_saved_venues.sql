-- Canonical saved venues for authenticated users (Phase 2 account sync).
--
-- Design notes:
--   • venue_id is the canonical Blaniko venue id, text 'BLK-XXXX'. There is
--     deliberately NO foreign key to public.venues: canonical ids must survive
--     retired or replaced venue records, and the earlier venue replacement
--     deleted user_favorites. Saved data must stay independent of venue ingestion.
--   • This is a PARALLEL table to the legacy web public.user_favorites (keyed by
--     venue_slug). The legacy table is not touched; reconciling the two is a
--     later, explicit task.
--   • saved_at is client-supplied so a mobile savedAt survives upload; it defaults
--     to now() otherwise.
--   • No updated_at and no UPDATE: a saved venue is inserted or deleted. Saving
--     again after an unsave is a new row. Duplicate saves are absorbed by the PK.
--   • Hard delete only. SYNC-GATE-1 (docs/database/sync-schema.md): no client sync
--     may ship until deletion propagation is resolved.
--
-- Privilege posture (the live postgres default ACLs grant REFERENCES, TRIGGER,
-- TRUNCATE and MAINTAIN on new public tables; none is relied upon):
--   anon            nothing (no grants, no policies)
--   authenticated   SELECT, INSERT, DELETE on own rows only (RLS)
--   service_role    SELECT, INSERT, UPDATE, DELETE (bypasses RLS)

-- ── Table ──────────────────────────────────────────────────────────────────────

create table public.user_saved_venues (
  user_id  uuid        not null default auth.uid()
                       references auth.users (id) on delete cascade,
  venue_id text        not null,
  saved_at timestamptz not null default now(),
  constraint user_saved_venues_pkey primary key (user_id, venue_id),
  constraint user_saved_venues_venue_id_format check (venue_id ~ '^BLK-[0-9]{4}$')
);

-- Newest-first listing for one user.
create index user_saved_venues_user_saved_at_idx
  on public.user_saved_venues (user_id, saved_at desc);

-- ── RLS + privileges ───────────────────────────────────────────────────────────

alter table public.user_saved_venues enable row level security;

revoke all on table public.user_saved_venues from anon;
revoke all on table public.user_saved_venues from authenticated;
revoke all on table public.user_saved_venues from service_role;

grant select, insert, delete on table public.user_saved_venues to authenticated;
grant select, insert, update, delete on table public.user_saved_venues to service_role;

create policy "authenticated users can select own saved venues"
  on public.user_saved_venues
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "authenticated users can insert own saved venues"
  on public.user_saved_venues
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "authenticated users can delete own saved venues"
  on public.user_saved_venues
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.user_saved_venues is
  'Account-sync saved venues keyed by canonical BLK id. No FK to venues by design. See docs/database/sync-schema.md.';
