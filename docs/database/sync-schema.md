# Account sync schema (Phase 2)

Server-side storage for user-owned Blaniko data, designed to match the mobile local
model (`blaniko.state.v2`, `blaniko.profile.v2`, `blaniko.sync.v1`, `blaniko.outbox.v1`).
This document is the **contract** between the database and the clients.

Status: **schema groundwork only.** The tables are created but unused. No account UI, no
login changes, no cloud-sync implementation, and no client is connected to them.

Migrations: `supabase/migrations/*_create_set_updated_at_function.sql`,
`*_create_user_saved_venues.sql`, `*_create_user_collections_and_items.sql`,
`*_create_user_outings.sql`, `*_create_user_taste_profiles.sql`.
Collection tombstones (Phase 3A, **implemented locally; not yet applied to production**):
`supabase/migrations/*_add_collection_tombstones.sql`.
Rollback references (never run automatically): `supabase/rollbacks/`.
Tests: `supabase/local-db-tests/sync-schema/`, run with `scripts/db/test-sync-schema-local.sh`; real two-session
concurrency proofs: `scripts/db/test-collection-tombstone-concurrency-local.sh`.

---

## SYNC-GATE-1 — deletion propagation blocks client sync

> **No mobile or web cloud-sync implementation may ship until deletion propagation for
> collections and outings has a resolved and tested strategy.**

Phase 2 created every table with **hard deletes** and **no tombstones**. With hard deletes
alone, a collection or outing deleted on one device can be **resurrected** by another device
that still holds it offline.

**Status.** The sync-protocol design (Phase 3A) resolved this with permanent, scrubbed server
tombstones for collections and outings (saved venues and collection items use per-device
baselines plus pending intent). **Collections are implemented locally** by the
collection-tombstone migration (see "Collection tombstones" below) and **outings are not yet**
(`user_outings` still hard-deletes), so the gate stays **closed**. It opens only when the
outing tombstones exist, both migrations have been applied and verified in production, and
the client reconciliation is implemented and tested.

The original problem statement, for reference: Mobile has a baseline only for favourites
(`favoritesBaseline`); nothing equivalent exists yet for collections, collection items or
outings.

Creating these tables unused is allowed. **Connecting any client to unsafe delete
synchronization is not.** Possible later solutions, to be chosen in the sync-protocol phase:

- per-entity client baselines (analogous to `favoritesBaseline`);
- `deleted_at` tombstones (a nullable column can be added by a forward migration);
- another explicit synchronization protocol.

---

## Conventions

| Rule | Detail |
|---|---|
| Owner | `user_id uuid` referencing `auth.users(id)` with `on delete cascade`. It defaults to `auth.uid()`. |
| Row security | RLS on every table; every policy is `to authenticated` with `(select auth.uid()) = user_id`. |
| Anonymous | `anon` has **no** privileges and **no** policies on any of these tables. |
| Venue references | Canonical `BLK-XXXX` text, checked by `^BLK-[0-9]{4}$`. **No foreign key to `public.venues`**: canonical ids must outlive venue replacement, and an earlier venue replacement deleted `user_favorites`. |
| Entity ids | Collections and outings use the **client-generated secure UUID** as the primary key. There is **no default**; an insert without an `id` fails. The same UUID is the identity locally and remotely. |
| Timestamps | `timestamptz`. `created_at`, `saved_at`, `added_at` are client-supplied (defaulting to `now()`), so mobile timestamps survive upload. `updated_at` is **server-controlled**: `public.set_updated_at()` runs `BEFORE INSERT OR UPDATE`, so a value a client names (even on `INSERT`) is **overwritten with server time**, and it is never a conflict key. |
| Guest data | Guest (unowned) rows stay local and are not uploaded until an explicit future ownership / first-sync flow. The outbox stays client-side; there is no server outbox. |
| Secure UUIDs | Clients must generate ids with a secure generator (no `Math.random`). |
| Prices | No price, budget or rating field exists anywhere in this schema. |
| Legacy tables | `public.user_favorites` (keyed by `venue_slug`) and `public.profiles` are **untouched**. Reconciling legacy web favourites is a later task. |

---

## `user_saved_venues`

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` | PK part, owner |
| `venue_id` | `text` | PK part, canonical `BLK-XXXX` |
| `saved_at` | `timestamptz` | default `now()`; mobile `savedAt` |

Primary key `(user_id, venue_id)`; saving the same venue twice is absorbed by the key. No
`updated_at`: a save is inserted or deleted (saving again after an unsave is a new row).
Authenticated: `SELECT`, `INSERT`, `DELETE` (no `UPDATE`).

## `user_collections` and `user_collection_items`

`user_collections`: `id uuid` **primary key, no default** (the client UUID), `user_id`,
`name`, `created_at`, `updated_at`.

- `UNIQUE (id, user_id)` exists **only** so the composite foreign key below has a unique
  target; it is redundant with the primary key.
- `name` must not be blank (not empty, and not only ASCII whitespace such as spaces, tabs or newlines). A 1000-character cap is an **abuse guard only**. No product
  limit exists (mobile has no rename; the web enforces none), so the cap is deliberately
  generous and may be relaxed by a forward migration. It is not a product rule.
- Names are **not unique**: two offline devices can both create "New collection 1".
- `deleted_at timestamptz` (nullable, no default): `NULL` is live, non-`NULL` is a **permanent tombstone** (see
  "Collection tombstones"). Authenticated may `UPDATE (name, deleted_at)` only; `id`, `user_id`, `created_at`,
  `updated_at` are immutable for clients.

`user_collection_items`: `collection_id`, `user_id`, `venue_id` (BLK), `added_at`; primary
key `(collection_id, venue_id)`.

**Ownership model.** `FOREIGN KEY (collection_id, user_id) REFERENCES user_collections
(id, user_id) ON DELETE CASCADE`, together with RLS, makes both attacks impossible:

| Attempt | Why it fails |
|---|---|
| A inserts an item into B's collection with `user_id = A` | there is no `(collection, A)` row: foreign key violation |
| A supplies `user_id = B` | the RLS `WITH CHECK` fails |

A collection is **no longer physically deleted by a client** (see "Collection tombstones"); deleting an
**account** still cascades everything: live collections, tombstones and items.
Authenticated and, since Phase 3A, `service_role` have `SELECT`, `INSERT`, `DELETE` on items and **no `UPDATE`**: items are immutable, and a membership change is an `INSERT` or a `DELETE` only (moving one is DELETE + INSERT), so it always passes the parent guard, lock and revision bump.

### Collection tombstones (Phase 3A)

A client deletes its own collection by setting `deleted_at` (`PATCH ... deleted_at = <any non-null value>`,
guarded by `id`, `updated_at = <baseline>` and `deleted_at IS NULL`). In one transaction the server:

1. replaces the requested value with its own transaction time,
2. scrubs `name` to exactly `Deleted collection` (an at-rest CHECK enforces that a tombstone can hold nothing else),
3. moves `updated_at` (`set_updated_at`, unchanged),
4. physically deletes every item of the collection.

The row **stays under its original UUID until the account is deleted** (no purge). Rules, all enforced by the
database for every role:

| Rule | Error |
|---|---|
| a tombstone can never become live (`deleted_at` cannot return to `NULL`) and cannot be edited, even by a no-op `UPDATE` | `TS002` |
| a collection cannot be created already deleted (`INSERT` with a non-null `deleted_at`) | `TS002` |
| an item cannot be added to a tombstoned collection | `TS001` |
| clients and `service_role` have no `DELETE` on `user_collections` (the DELETE policy is dropped) | `42501` |

`TS001` / `TS002` are custom SQLSTATEs (a client-visible contract). The tombstone stays `SELECT`able by its owner and
the UUID can never be reused (the primary-key row remains; another user gets `23505`).

**Parent revision.** Every successful item `INSERT` or `DELETE` on a **live** collection moves that collection's
`updated_at` (once per statement per collection; a skipped `ON CONFLICT DO NOTHING` row does not). The two bump
functions are the only `SECURITY DEFINER` functions in this schema (owner `postgres`, `search_path = ''`, no dynamic
SQL, no client `EXECUTE`); each updates only `updated_at` of live parents named by the statement's own transition
table. A `BEFORE ROW` trigger on items locks the exact parent row `FOR NO KEY UPDATE` first, so item inserts, item
deletes and the tombstone all serialize on the parent (the foreign key alone takes only `FOR KEY SHARE`, which does not
conflict with the tombstone). Proved with real two-session tests under `READ COMMITTED`.

Rollback reference: `supabase/rollbacks/*_add_collection_tombstones.down.sql`. It **refuses to run while any tombstone
exists** (dropping `deleted_at` would resurrect them), so it is safe only before any client uses the feature.

**Sync protocol constraint.** Create with `INSERT ... ON CONFLICT (id) DO NOTHING`
(PostgREST `ignore-duplicates`) and change a name with a `PATCH`. A merge-upsert
(`DO UPDATE`) is not supported because `id`, `user_id` and `created_at` are immutable for
clients.

## `user_outings`

Columns: `id uuid` **primary key, no default** (the client UUID), `user_id`,
`schema_version smallint`, `payload jsonb`, `created_at`, `updated_at`.

`user_outings` is the **canonical future synchronized outing store**, with **one payload
lineage**. The legacy web-local outing shape (`title`, `summary`, `budget`, `withWho`,
`mood`, slug-keyed stops, ...) stays **local and unsynced**; a later explicit task converts it
into the canonical format. `schema_version` therefore has a single meaning, and future
versions evolve it through **forward migrations**. No `payload_kind` column exists.

### Canonical payload, `schema_version = 1`

```json
{
  "name":    { "en": "Stay in Maarif", "fr": "..." },
  "why":     { "en": "Fewer moves: every stop is in Maarif.", "fr": "..." },
  "stopIds": ["BLK-0001", "BLK-0014", "BLK-0030"],
  "answers": { "who": "friends", "mood": "active", "time": "half", "area": null }
}
```

Enforced by `public.is_valid_outing_payload_v1(jsonb)`:

- the payload is a JSON **object**;
- required keys: `name`, `stopIds`, `answers`; `why` is **optional**;
- `name`, and `why` when present, is an object with a string `en`; `fr` is optional and,
  if present, a string (a JSON `null` `why` is rejected: omit the key instead);
- `stopIds` is an array of **0 to 4** canonical `BLK-XXXX` strings (4 is the planner's
  largest outing);
- `answers` is a JSON object. Its planner keys (`who`, `mood`, `time`, `area`) are the
  clients' contract and are not enforced by the database. `time` is a **sizing**
  preference (number of stops), never a duration.
- **Unknown top-level keys are rejected.** For `schema_version = 1` the only valid top-level
  keys are exactly `name`, `stopIds`, `answers` (required) and `why` (optional). Any other
  top-level key is invalid and the row is refused: `price`, `budget`, `duration`, a
  differently cased duplicate such as `Name`, or any undeclared field. Version 1 has exactly one
  meaning; a new field must arrive with a **new `schema_version`** through a forward migration,
  never silently under version 1. This applies to `INSERT` and to every `UPDATE` of `payload`.
  Keys *inside* `answers` are the clients' planner contract and are not enumerated.
- **No price or budget field** exists, is required, or can be added under version 1.

`id` and `createdAt` are columns, not payload.

Only `schema_version = 1` is accepted for now (a constraint, so an unknown version cannot
bypass shape validation). A future version 2 replaces the two payload constraints in a
forward migration. The serialized payload is capped at **32768 bytes**: the largest valid
outing the current planner can produce is about 0.4 KB (4 stops, the longest area name, both
languages), so the cap is roughly 75x headroom and exists only to bound abuse.

Authenticated: `SELECT`, `INSERT`, `DELETE`, and `UPDATE (schema_version, payload)`.
`updated_at` is server-controlled on both `INSERT` and `UPDATE` (see Conventions).

## `user_taste_profiles`

Not `public.profiles`: that table holds account settings (email, language, theme) and is
untouched. This holds the mobile first-use taste. One row per user (`user_id` primary key).

| Column | Type | Canonical values |
|---|---|---|
| `schema_version` | `smallint` | `1` |
| `interests` | `text[]` | subset of `padel`, `football`, `entertainment`, `kids-family`, `sports`, `billiards`, `water-beach`, `adventure`, `wellness`; no `NULL`, no duplicates |
| `usual_company` | `text[]` | subset of `friends`, `partner`, `family`, `solo`; no `NULL`, no duplicates |
| `setting` | `text` | `indoor`, `outdoor`, or `NULL` (no preference) |
| `profile_updated_at` | `timestamptz` | the **client's** edit time; `NULL` when unknown (a migrated profile) |

`profile_updated_at` is the **last-write-wins key**, supplied by the client. `NULL` must lose to
any real timestamp. `updated_at` is server-controlled upload-time metadata (rewritten on `INSERT`
and `UPDATE`, whatever a client sends) and is never used to resolve conflicts. The
domains are **closed**; a new category or company value is added by a forward migration
that replaces the constraint (the narrowly scoped helper `public.taste_array_is_valid`
checks membership and uniqueness). Excluded on purpose: email, theme, language, the setup
progress record and the Home moment.

Authenticated: `SELECT`, `INSERT`, and `UPDATE` of the five business columns; no `DELETE`.

---

## Privileges

The live `postgres` default ACLs hand `REFERENCES`, `TRIGGER`, `TRUNCATE` and `MAINTAIN`
to `anon` and `authenticated` on every new public table. **These migrations do not rely on
defaults.** Every table: enable RLS, `REVOKE ALL` from `anon`, `authenticated` and
`service_role`, then grant only the row operations listed above. `service_role` receives
`SELECT, INSERT, UPDATE, DELETE` and no structural privilege. The global default ACL is not
changed in this phase. **Exception since Phase 3A:** neither `authenticated` nor `service_role` has `DELETE` on
`user_collections` (physical deletion of an individual collection would free a tombstoned UUID); account deletion is
unaffected because the foreign-key cascade runs with the table owner's rights. `service_role` also lost `UPDATE` on `user_collection_items` (see above).

## Not in this round

Outing tombstones (see SYNC-GATE-1), a sync cursor, per-user row quotas, legacy
`user_favorites` reconciliation, any account UI or Auth configuration, and the mobile
Supabase client. The pre-Phase-2 production baseline is captured in `supabase/baseline/` (read-only, outside
`supabase/migrations/`) and the regression comparison is `scripts/db/regress-phase2-against-baseline-local.sh`.
