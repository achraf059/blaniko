/**
 * updateVenueData.ts
 *
 * One-time data enrichment script for Blaniko venues.
 * Fills in missing price_level and lat/lng based on subcategory / neighborhood.
 *
 * Usage:
 *   Dry run (prints what would change, no writes):
 *     tsx scripts/updateVenueData.ts --dry-run
 *
 *   Real update:
 *     tsx scripts/updateVenueData.ts
 *
 * Run from the backend/ directory so dotenv finds backend/.env
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase client ──────────────────────────────────────────────────────────

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env"
  );
  process.exit(1);
}

// We do NOT log supabaseUrl or supabaseKey.
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// ─── Mode ─────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");

// ─── Price-level rules ────────────────────────────────────────────────────────

function inferPriceLevel(subcategory: string | null): string {
  const sub = (subcategory ?? "").toLowerCase().trim();

  // $ — cheap / low-barrier
  if (
    sub === "billiards" ||
    sub.includes("gaming") ||
    sub === "indoor play" ||
    sub === "football" ||
    sub === "basketball" ||
    sub === "outdoor amusement"
  ) {
    return "$";
  }

  // $$$ — premium
  if (sub.includes("beach club") || sub === "theme park") {
    return "$$$";
  }

  // $$ — default mid-tier (padel, escape room, bowling, laser game, karting, unknown)
  return "$$";
}

// ─── Coordinate rules ─────────────────────────────────────────────────────────

type Coords = { lat: number; lng: number };

const NEIGHBORHOOD_COORDS: Array<{ pattern: RegExp; coords: Coords }> = [
  { pattern: /maarif/i,          coords: { lat: 33.5763, lng: -7.6333 } },
  { pattern: /ain\s*diab/i,      coords: { lat: 33.5892, lng: -7.6789 } },
  { pattern: /gauthier/i,        coords: { lat: 33.5902, lng: -7.6208 } },
  { pattern: /old\s*medina|ancienne\s*m[eé]dina|medina/i, coords: { lat: 33.5950, lng: -7.6186 } },
  { pattern: /sidi\s*maarouf/i,  coords: { lat: 33.5338, lng: -7.6597 } },
  { pattern: /bourgogne/i,       coords: { lat: 33.5955, lng: -7.6400 } },
  { pattern: /palmier/i,         coords: { lat: 33.5819, lng: -7.6295 } },
  { pattern: /racine/i,          coords: { lat: 33.5894, lng: -7.6344 } },
  { pattern: /centre.?ville|downtown/i, coords: { lat: 33.5946, lng: -7.6180 } },
  { pattern: /mers\s*sultan/i,   coords: { lat: 33.5775, lng: -7.6105 } },
  { pattern: /sidi\s*bernoussi/i, coords: { lat: 33.6085, lng: -7.5017 } },
];

const CASABLANCA_CENTER: Coords = { lat: 33.5731, lng: -7.5898 };

function inferCoords(neighborhood: string | null, region: string | null): Coords | null {
  const haystack = [neighborhood, region].filter(Boolean).join(" ");
  if (!haystack) return null;

  for (const { pattern, coords } of NEIGHBORHOOD_COORDS) {
    if (pattern.test(haystack)) return coords;
  }

  // If the row is in Casablanca but neighborhood wasn't matched, use city center
  if (/casablanca/i.test(haystack)) return CASABLANCA_CENTER;

  return null;
}

// ─── DB row type (only what we need) ─────────────────────────────────────────

type VenueRow = {
  id: number;
  external_id: string;
  name: string;
  slug: string;
  subcategory: string | null;
  neighborhood: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
  price_level: string | null;
};

// ─── Planned update ───────────────────────────────────────────────────────────

type VenueUpdate = {
  id: number;
  external_id: string;
  name: string;
  subcategory: string | null;
  neighborhood: string | null;
  price_level?: string;
  lat?: number;
  lng?: number;
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("─".repeat(60));
  console.log(`Blaniko — venue data enrichment`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE UPDATE"}`);
  console.log("─".repeat(60));

  // 1. Connection check
  console.log("\n[1/4] Checking Supabase connection…");
  const { error: pingError } = await supabase
    .from("venues")
    .select("id")
    .limit(1);

  if (pingError) {
    console.error("  ✗ Connection failed:", pingError.message);
    process.exit(1);
  }
  console.log("  ✓ Connected to Supabase");

  // 2. Fetch all active venues
  console.log("\n[2/4] Fetching all active venues…");
  const { data: rows, error: fetchError } = await supabase
    .from("venues")
    .select("id, external_id, name, slug, subcategory, neighborhood, region, lat, lng, price_level")
    .eq("is_active", true)
    .order("external_id", { ascending: true });

  if (fetchError || !rows) {
    console.error("  ✗ Fetch failed:", fetchError?.message ?? "no data");
    process.exit(1);
  }

  const venues = rows as VenueRow[];
  console.log(`  ✓ Fetched ${venues.length} active venues`);

  // 3. Compute planned updates
  console.log("\n[3/4] Computing updates…");

  const updates: VenueUpdate[] = [];
  let priceMissing = 0;
  let coordsMissing = 0;

  for (const v of venues) {
    const update: VenueUpdate = {
      id: v.id,
      external_id: v.external_id,
      name: v.name,
      subcategory: v.subcategory,
      neighborhood: v.neighborhood,
    };

    let hasChange = false;

    // price_level — only fill if currently null/empty
    if (!v.price_level) {
      priceMissing++;
      update.price_level = inferPriceLevel(v.subcategory);
      hasChange = true;
    }

    // lat/lng — only fill if both are currently null
    if (v.lat == null || v.lng == null) {
      coordsMissing++;
      const coords = inferCoords(v.neighborhood, v.region);
      if (coords) {
        update.lat = coords.lat;
        update.lng = coords.lng;
        hasChange = true;
      }
    }

    if (hasChange) {
      updates.push(update);
    }
  }

  console.log(`  → Venues needing price_level:  ${priceMissing}`);
  console.log(`  → Venues needing lat/lng:       ${coordsMissing}`);
  console.log(`  → Total rows that will change:  ${updates.length}`);

  if (updates.length === 0) {
    console.log("\n✓ Nothing to update — all venues already have price_level and coordinates.");
    await printSummary(venues.length);
    return;
  }

  // 4a. Dry run — print planned changes
  if (DRY_RUN) {
    console.log("\n─── Planned changes ──────────────────────────────────────");
    for (const u of updates) {
      const parts: string[] = [];
      if (u.price_level !== undefined) parts.push(`price_level → "${u.price_level}"`);
      if (u.lat !== undefined && u.lng !== undefined) parts.push(`coords → (${u.lat}, ${u.lng})`);
      console.log(
        `  ${u.external_id}  ${u.name.padEnd(38)}  subcategory: ${(u.subcategory ?? "—").padEnd(18)}  neighborhood: ${(u.neighborhood ?? "—").padEnd(20)}  ${parts.join("  |  ")}`
      );
    }
    console.log("─".repeat(60));
    console.log(`\nDRY RUN complete. ${updates.length} rows would be updated.`);
    console.log("Re-run without --dry-run to apply changes.");
    return;
  }

  // 4b. Live update — apply in batches of 20
  console.log("\n[4/4] Applying updates to Supabase…");

  const BATCH_SIZE = 20;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);

    for (const u of batch) {
      const patch: Record<string, unknown> = {};
      if (u.price_level !== undefined) patch.price_level = u.price_level;
      if (u.lat !== undefined) patch.lat = u.lat;
      if (u.lng !== undefined) patch.lng = u.lng;

      const { error } = await supabase
        .from("venues")
        .update(patch)
        .eq("id", u.id);

      if (error) {
        console.error(`  ✗ Failed to update ${u.external_id} (${u.name}):`, error.message);
        errorCount++;
      } else {
        successCount++;
      }
    }

    console.log(`  … updated ${Math.min(i + BATCH_SIZE, updates.length)} / ${updates.length}`);
  }

  console.log(`\n  ✓ Updated:  ${successCount} rows`);
  if (errorCount > 0) {
    console.log(`  ✗ Errors:   ${errorCount} rows`);
  }

  await printSummary(venues.length);
}

// ─── Post-run summary ─────────────────────────────────────────────────────────

async function printSummary(totalExpected: number) {
  console.log("\n─── Verification summary ─────────────────────────────────");

  const { count: totalCount } = await supabase
    .from("venues")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: latCount } = await supabase
    .from("venues")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
    .not("lat", "is", null);

  const { count: lngCount } = await supabase
    .from("venues")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
    .not("lng", "is", null);

  const { count: priceCount } = await supabase
    .from("venues")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
    .not("price_level", "is", null);

  console.log(`  Total active venues:          ${totalCount ?? "?"} (expected ~${totalExpected})`);
  console.log(`  Venues with lat:              ${latCount ?? "?"}`);
  console.log(`  Venues with lng:              ${lngCount ?? "?"}`);
  console.log(`  Venues with price_level:      ${priceCount ?? "?"}`);

  const missing = (totalCount ?? 0) - (latCount ?? 0);
  const missingPrice = (totalCount ?? 0) - (priceCount ?? 0);
  if (missing > 0)      console.log(`  ⚠  Still missing lat/lng:     ${missing}`);
  if (missingPrice > 0) console.log(`  ⚠  Still missing price_level: ${missingPrice}`);
  if (missing === 0 && missingPrice === 0) console.log("  ✓ All venues have coordinates and price_level");

  // Sample 10 venues
  const { data: sample } = await supabase
    .from("venues")
    .select("external_id, name, neighborhood, subcategory, lat, lng, price_level")
    .eq("is_active", true)
    .order("external_id", { ascending: true })
    .limit(10);

  if (sample && sample.length > 0) {
    console.log("\n─── Sample (first 10 venues) ─────────────────────────────");
    console.log(
      "  " +
      "EXT_ID".padEnd(10) +
      "NAME".padEnd(34) +
      "NEIGHBORHOOD".padEnd(22) +
      "SUBCATEGORY".padEnd(20) +
      "LAT".padEnd(10) +
      "LNG".padEnd(12) +
      "PRICE"
    );
    console.log("  " + "─".repeat(110));
    for (const row of sample) {
      const r = row as {
        external_id: string;
        name: string;
        neighborhood: string | null;
        subcategory: string | null;
        lat: number | null;
        lng: number | null;
        price_level: string | null;
      };
      console.log(
        "  " +
        (r.external_id ?? "—").padEnd(10) +
        (r.name ?? "").slice(0, 32).padEnd(34) +
        (r.neighborhood ?? "—").slice(0, 20).padEnd(22) +
        (r.subcategory ?? "—").slice(0, 18).padEnd(20) +
        (r.lat?.toFixed(4) ?? "—").padEnd(10) +
        (r.lng?.toFixed(4) ?? "—").padEnd(12) +
        (r.price_level ?? "—")
      );
    }
  }

  console.log("─".repeat(60));
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
