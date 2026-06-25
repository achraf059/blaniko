-- Persistent favorites for authenticated users.
--
-- Design notes:
--   • Primary key is (user_id, venue_slug) — composite, so toggling the same
--     slug twice is a no-op INSERT-wise (ON CONFLICT DO NOTHING) and a safe
--     DELETE even if the row was already gone.
--   • venue_slug is a text identifier matching the frontend slug, not a FK to
--     a venues table (venues live in Supabase as well, but keeping this loose
--     avoids cascade pain if a venue is ever renamed or retired).
--   • ON DELETE CASCADE on user_id ensures all favorites are removed when the
--     auth user is deleted — no orphaned rows.
--   • No UPDATE policy — favorites are toggled (insert / delete only).
--   • No anon access — guests use localStorage exclusively.

-- ── Table ──────────────────────────────────────────────────────────────────────

create table if not exists public.user_favorites (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  venue_slug text        not null,
  created_at timestamptz not null default now(),
  primary key (user_id, venue_slug)
);

-- ── RLS ────────────────────────────────────────────────────────────────────────

alter table public.user_favorites enable row level security;

-- Authenticated users may read only their own favorites.
create policy "authenticated users can select own favorites"
  on public.user_favorites
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Authenticated users may insert only their own favorites.
create policy "authenticated users can insert own favorites"
  on public.user_favorites
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Authenticated users may delete only their own favorites.
create policy "authenticated users can delete own favorites"
  on public.user_favorites
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Privilege layer: required in addition to RLS policies.
-- service_role bypasses RLS and is included so the backend can administer rows.
grant select, insert, delete on public.user_favorites to authenticated;
grant select, insert, delete on public.user_favorites to service_role;

-- ── Index ──────────────────────────────────────────────────────────────────────

-- Speeds up "fetch all favorites for user X" queries.
create index if not exists user_favorites_user_id
  on public.user_favorites (user_id);
