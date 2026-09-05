# V3 Venue Data Migration

**Code:** `scripts/extract_v3_to_json.py`, `backend/scripts/importV3Venues.ts`
**Migrations:** `20260809000000_modernize_venues_schema.sql` and successors
**Reference:** [Venue ID crosswalk](../venue-id-crosswalk-pre-v3-to-v3.md), machine-readable at `scripts/venue-id-crosswalk-pre-v3-to-v3.json`

## Problem

The original venue records (V0) were flat rows optimized for research collection: free-text categories, a single audience string, no verification tracking. The product needed structured data the recommendation engine could score on — canonical categories, audience/atmosphere tag arrays, booking metadata — plus an honest record of *how verified* each field is.

## Previous approach and why it was insufficient

- Free-text categories forced a growing pile of mapping heuristics in the API layer.
- There was no way to distinguish "verified fact" from "researcher's best guess"; earlier enrichment scripts even **inferred** price levels from subcategory heuristics, which would have silently mixed guesses into real data (that script is now removed; its package scripts are gone too).
- Two venue numbering systems existed: the old sheet's `BLK-` IDs and the finalized V3 IDs, which diverge by +1 from `BLK-0037` onward due to a phantom row. Any import keyed on the wrong generation would attach data to the wrong venue.

## Chosen change

1. **Schema evolution by sequential migration** — the `venues` table gained canonical category/subcategory, `audience_tags`, `atmosphere_tags`, `additional_experiences`, booking fields, and verification metadata (`research_status`, `verification_level`, `last_verified_date`, `verified_by`). Old columns were kept for compatibility; the API maps structured fields first and falls back to computed values.
2. **A two-stage import pipeline**:
   - a Python extractor reads the official workbook, validates row counts and IDs against an expected set, and **fails loudly rather than silently using a stale or backup workbook**;
   - a TypeScript importer validates the JSON payload in `--dry-run` mode (no writes), and on `--confirm-replace` first writes a timestamped backup of the existing rows and **verifies the backup by reading it back** before replacing anything.
3. **Stable identity via crosswalk** — the V3 `BLK-` IDs are declared permanent and canonical. The old→new mapping was verified name-by-name against Google Maps identity with zero mismatches and recorded in both human-readable and machine-readable form. Retired IDs (a closed venue and two editorial removals) are hard-coded as never-reassignable in both the extractor and the importer.
4. **Unverified stays empty** — V3 records explicitly carry `price: null`, `price_level: null`, and null coordinates until each is directly verified. Nothing is inferred.

## Tradeoffs

- Keeping legacy columns and fallback mapping logic adds surface area to `mapVenue`, but allowed the migration to land incrementally without a frontend flag-day.
- Full-replacement imports (vs. row-level upserts) are simpler and atomic but destructive; the dry-run + verified-backup discipline exists precisely to make that safe, and the importer includes a guard against being re-run accidentally.

## Verification

`backend/src/__tests__/venueMapping.test.ts` pins the mapping contract: structured V3 fields take precedence, fallbacks compute correctly for legacy rows, placeholder values ("Not confirmed") are suppressed rather than rendered, verification metadata maps through unchanged, and absent price/coordinates stay absent. The extractor and importer validate counts and ID sets against the canonical expected list on every run.

## Remaining limitation

The workbook remains the editorial source of truth, so the pipeline is one-directional; admin-panel edits and workbook edits are reconciled manually. Coordinates and pricing remain unpopulated until field verification.
