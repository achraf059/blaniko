# Public Form Security: From Anonymous Inserts to Express-Mediated Writes

**Code:** `backend/src/routes/waitlist.ts`, `backend/src/routes/venue-claims.ts`, `backend/src/middleware/publicFormLimiter.ts`
**Migrations:** `20260624000000_add_anon_insert_policies_for_public_forms.sql`, `20260723000000_revoke_anon_insert_public_forms.sql`
**Tests:** `backend/src/__tests__/publicForms.test.ts`

## Problem

Blaniko has two public write paths that require no login: the waitlist email form and the venue claim/listing form. They need to accept input from anonymous visitors while resisting spam, malformed data, and abuse.

## Previous approach and why it was insufficient

The first implementation let the frontend insert directly into Supabase using the anonymous key, with RLS policies granting `anon` INSERT on the two tables. This shipped fast, but it meant:

- **No server-side validation** — any client could insert arbitrary well-formed rows; length limits and format checks lived only in UI code that an attacker doesn't run.
- **No rate limiting** — the anonymous key is public by design, so anyone could script unlimited inserts.
- **Error details leaked** — database errors surfaced raw to the client.

## Chosen change

Route both forms through the Express backend and revoke the anonymous grants at the database:

1. `POST /api/waitlist` and `POST /api/venue-claims` perform full server-side validation: email format, enum whitelists (source, language, claim type), length caps on every field, URL and phone format checks. Invalid requests never reach the database.
2. A shared rate limiter (20 requests / 15 min per IP) covers both endpoints; the admin login has its own stricter limiter.
3. The backend writes with the **service-role key**, which never leaves the server. Migration `20260723…` revokes the `anon` INSERT policies, so bypassing Express is no longer possible.
4. Database errors are mapped to stable, generic API responses — a Postgres unique violation (`23505`) becomes HTTP 409 `already_subscribed`; everything else becomes a plain 500 with no internals.

## Tradeoffs

- The backend became a required component for form submission (previously the static frontend alone sufficed). Accepted: the same backend already existed for admin operations.
- In-memory rate limiting resets on restart and is per-instance. Acceptable for a single-instance MVP; a shared store would be needed for horizontal scaling.

## Verification

The endpoint behavior is covered by tests with a mocked Supabase client: valid inserts with normalization (lowercased emails, trimmed fields, `null` over empty strings), each validation rejection, the `23505 → 409` mapping, generic error responses that leak no database details, and the 429 rate-limit response after the 20-request window is exhausted.

## Remaining limitation

Rate limiting keys on IP only; there is no CAPTCHA or reputation layer, so a distributed spammer could still submit garbage rows (they would be well-formed and size-capped, and reviewed manually).
