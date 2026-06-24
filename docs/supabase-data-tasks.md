# Supabase Data Tasks — Blaniko V0

Manual data work needed before MapPage, budget filters, and category pages work fully.
Run SQL in the Supabase SQL editor (Dashboard → SQL editor → New query).

---

## 1. Add missing columns

The backend `mapVenue()` now maps these columns when they exist.
If they are absent, the features simply degrade gracefully (no crash).

```sql
-- Coordinates for MapPage
ALTER TABLE venues ADD COLUMN IF NOT EXISTS lat  DOUBLE PRECISION;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS lng  DOUBLE PRECISION;

-- Price level for budget filter
-- Expected values: '$', '$$', '$$$'
ALTER TABLE venues ADD COLUMN IF NOT EXISTS price_level TEXT;
```

---

## 2. Populate lat / lng

Casablanca bounding box: lat 33.46–33.66, lng -7.75–-7.45

Use per-venue Google Maps coordinates when possible.
If an exact address is unconfirmed, use the neighborhood centroid below as a starting point.

| Neighborhood       | lat      | lng      |
|--------------------|----------|----------|
| Maarif             | 33.5763  | -7.6333  |
| Ain Diab           | 33.5892  | -7.6789  |
| Gauthier           | 33.5902  | -7.6208  |
| Old Medina         | 33.5950  | -7.6186  |
| Sidi Maarouf       | 33.5338  | -7.6597  |
| Corniche           | 33.6012  | -7.6525  |
| Anfa               | 33.5740  | -7.6490  |

Example bulk update using neighborhood:

```sql
-- Set approximate coordinates for all Maarif venues
UPDATE venues
SET lat = 33.5763, lng = -7.6333
WHERE neighborhood ILIKE '%Maarif%'
  AND lat IS NULL;

-- Ain Diab
UPDATE venues
SET lat = 33.5892, lng = -7.6789
WHERE neighborhood ILIKE '%Ain Diab%'
  AND lat IS NULL;
```

Once MapPage has even one venue with coordinates, the map canvas activates.

---

## 3. Populate price_level

Budget filter values the frontend expects: `'$'`, `'$$'`, `'$$$'`

Suggested mapping by subcategory:

| Subcategory          | Suggested price_level |
|----------------------|-----------------------|
| Billiards            | $                     |
| Gaming / Arcade      | $                     |
| Outdoor Amusement    | $                     |
| Indoor Play          | $$                    |
| Football (5-a-side)  | $$                    |
| Basketball           | $$                    |
| Padel                | $$                    |
| Bowling              | $$                    |
| Laser Game           | $$                    |
| Escape Room          | $$                    |
| Karting              | $$$                   |
| Beach Club           | $$$                   |
| Theme Park           | $$$                   |

Example bulk update:

```sql
UPDATE venues SET price_level = '$'  WHERE subcategory ILIKE 'Billiards';
UPDATE venues SET price_level = '$'  WHERE subcategory ILIKE 'Gaming%';
UPDATE venues SET price_level = '$'  WHERE subcategory ILIKE 'Outdoor Amusement';
UPDATE venues SET price_level = '$$' WHERE subcategory ILIKE 'Indoor Play';
UPDATE venues SET price_level = '$$' WHERE subcategory ILIKE 'Football';
UPDATE venues SET price_level = '$$' WHERE subcategory ILIKE 'Padel';
UPDATE venues SET price_level = '$$' WHERE subcategory ILIKE 'Bowling';
UPDATE venues SET price_level = '$$' WHERE subcategory ILIKE 'Laser Game';
UPDATE venues SET price_level = '$$' WHERE subcategory ILIKE 'Escape Room';
UPDATE venues SET price_level = '$$' WHERE subcategory ILIKE 'Basketball';
UPDATE venues SET price_level = '$$$' WHERE subcategory ILIKE 'Karting';
UPDATE venues SET price_level = '$$$' WHERE subcategory ILIKE '%Beach Club%';
UPDATE venues SET price_level = '$$$' WHERE subcategory ILIKE 'Theme Park';
```

---

## 4. Category corrections

The frontend routing expects these `categorySlug` values:
`activities`, `sports`, `gaming`, `outdoor`, `family`

The backend `toCategorySlug()` function derives this from the DB `category` + `subcategory` columns.
If a venue shows under the wrong category page, check:
1. `subcategory` value in the DB matches one of the keys in `toCategorySlug()` (case-insensitive)
2. If `subcategory` is NULL, the `category` column is used as fallback

Current mappings (from `backend/src/routes/venues.ts`):

```
billiards         → activities
escape room       → activities
karting           → activities
bowling           → activities
laser game        → activities
gaming / arcade   → gaming
padel             → sports
football          → sports
basketball        → sports
outdoor amusement → outdoor
beach club        → outdoor
indoor play       → family
theme park        → family
```

If you add new subcategories, update `toCategorySlug()` in `backend/src/routes/venues.ts`.

---

## 5. Couples / friends are bestFor filters — not categories

**Do not add venues with `category = 'couples'` or `category = 'friends'`.**

These slugs exist as frontend category routes for legacy nav compatibility, but:
- There is no Supabase category that maps to `couples` or `friends`
- The `toCategorySlug()` function does not produce these slugs from any subcategory
- The UI now redirects `/categories/couples` → `/search?bestFor=date-spot`
  and `/categories/friends` → `/search?bestFor=friends`

Instead, when a venue is good for couples/dates, set its `best_for_tags` array to include `"date-spot"`.
When it is a group-friendly venue, include `"friends"` and `"group-activity"`.

The backend computes `bestForTags` automatically from `subcategory` when the DB array is empty.
To override, set the `best_for_tags` column explicitly:

```sql
-- Example: mark a specific venue as a date spot
UPDATE venues
SET best_for_tags = ARRAY['date-spot', 'friends', 'late-night']
WHERE slug = 'your-venue-slug';
```

---

## 6. Verification queries

Run these after populating data to confirm nothing is missing.

```sql
-- Venues missing coordinates
SELECT external_id, name, neighborhood FROM venues
WHERE is_active = TRUE AND (lat IS NULL OR lng IS NULL)
ORDER BY external_id;

-- Venues missing price_level
SELECT external_id, name, subcategory FROM venues
WHERE is_active = TRUE AND price_level IS NULL
ORDER BY subcategory, external_id;

-- Venue count by derived category slug (approximate)
SELECT
  LOWER(TRIM(subcategory)) AS sub,
  COUNT(*) AS count
FROM venues
WHERE is_active = TRUE
GROUP BY sub
ORDER BY count DESC;
```
