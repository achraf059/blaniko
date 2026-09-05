# Blaniko Data Pipeline

How venue data moves from the official workbook into the application.

For the design rationale and history of this pipeline, see
[technical-decisions/v3-data-migration.md](technical-decisions/v3-data-migration.md).

## Current pipeline (V3)

```
official workbook (Blaniko_Venues_FINAL_v3.xlsx, sheet "Blaniko Official MVP")
  → scripts/extract_v3_to_json.py        validated JSON payload
  → backend/scripts/importV3Venues.ts    --dry-run first, then --confirm-replace
  → Supabase/PostgreSQL (venues table)
  → Express API (/api/venues)            mapVenue(): structured fields + fallbacks
  → frontend useVenues() hook            cached, request-deduplicated
```

Rules enforced by the tooling:

- The extractor validates the venue count and the exact expected `BLK-` ID set,
  and fails loudly if the workbook is missing — it never silently falls back to
  an older or backup workbook.
- The importer refuses to write without a valid payload, always supports
  `--dry-run`, and takes a timestamped, read-back-verified backup before any
  replacement.
- Retired venue IDs are hard-coded as never-reassignable in both the extractor
  and the importer.
- Unverified fields (price, price level, coordinates) are imported as null —
  never inferred.
- `frontend/src/data/mockData.ts` is **sample/fallback data only** (used when no
  backend is reachable); production venue data lives in Supabase.

## Venue identity

`BLK-XXXX` external IDs from the V3 workbook are permanent and canonical.
The mapping from the older pre-V3 numbering is documented in
[venue-id-crosswalk-pre-v3-to-v3.md](venue-id-crosswalk-pre-v3-to-v3.md).

## Editorial inclusion policy

Blaniko is an activity-discovery product, not a restaurant directory.

Include a place only if it answers **"What can I do there?"** — not merely
"Where can I eat?". Cafés and restaurants qualify only when they are
experience-based (rooftop with a view, game café, beach club, themed
experience). Generic restaurants, cafés, and fast food do not qualify.

Quality over quantity: a venue needs a clear name, category, area, short
description, and a reason it belongs on Blaniko. Weak rows are not added just
to increase the count.
