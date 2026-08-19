/**
 * importV3Venues.ts
 *
 * Imports V3 venue data from the JSON payload produced by extract_v3_to_json.py.
 *
 * Modes:
 *   --dry-run        Validate the payload and print a summary (no DB operations)
 *   --confirm-replace Actually call the replace_venues_v3 RPC (production replacement)
 *
 * Usage:
 *   tsx scripts/importV3Venues.ts --dry-run
 *   tsx scripts/importV3Venues.ts --dry-run --payload path/to/v3_venues_payload.json
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { supabase } from "../src/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

interface V3Venue {
  external_id: string;
  name: string;
  slug: string;
  category: string;
  subcategory: string | null;
  additional_experiences: string[] | null;
  location_text: string | null;
  google_maps_url: string | null;
  contact_information: string;
  audience_tags: string[];
  experience_description: string | null;
  atmosphere_tags: string[];
  indoor_outdoor: string | null;
  website: string | null;
  facebook: string | null;
  instagram: string | null;
  opening_hours_raw: string | null;
  booking_method: string[] | null;
  booking_link: string | null;
  last_verified_date: string | null;
  verified_by: string | null;
  research_status: string;
  verification_level: string;
  price: null;
  price_details: null;
  price_level: null;
  lat: null;
  lng: null;
  is_active: boolean;
  source: string;
  // Compatibility
  address: string | null;
  phone: string;
  google_maps_link: string | null;
  audience: string | null;
  vibe: string | null;
  short_description: string | null;
  overview: string | null;
  region: null;
  neighborhood: null;
  image_url: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EXPECTED_COUNT = 97;

// Permanently retired venues — removed from the MVP and NEVER to be reintroduced.
// Their BLK identities must never be reassigned to another venue.
//   BLK-0020  E-Blue Gaming Center            (permanently closed)
//   BLK-0044  Étoile Football Académie (EFA)  (product/editorial decision)
const RETIRED_IDS = new Set<string>(["BLK-0020", "BLK-0044"]);

const EXPECTED_IDS = new Set<string>(
  [
    ...Array.from({ length: 36 }, (_, i) => `BLK-${String(i + 1).padStart(4, "0")}`),
    ...Array.from({ length: 63 }, (_, i) => `BLK-${String(i + 38).padStart(4, "0")}`),
  ].filter((id) => !RETIRED_IDS.has(id))
);

const UNKNOWN_CONTACT_IDS = new Set(["BLK-0045", "BLK-0068", "BLK-0076", "BLK-0089"]);

const VALID_INDOOR_OUTDOOR = new Set(["Indoor", "Outdoor", "Indoor / Outdoor"]);

// ─── Validation ──────────────────────────────────────────────────────────────

function validate(venues: V3Venue[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Exactly 99 rows
  if (venues.length !== EXPECTED_COUNT) {
    errors.push(`Expected ${EXPECTED_COUNT} venues, got ${venues.length}`);
  }

  // Exact ID set
  const actualIds = new Set(venues.map((v) => v.external_id));
  for (const expected of EXPECTED_IDS) {
    if (!actualIds.has(expected)) errors.push(`Missing ID: ${expected}`);
  }
  for (const actual of actualIds) {
    if (!EXPECTED_IDS.has(actual)) errors.push(`Extra ID: ${actual}`);
  }

  // BLK-0037 absent
  if (actualIds.has("BLK-0037")) errors.push("BLK-0037 must be absent");

  // Retired venues must never reappear (guards against regeneration from the source xlsx)
  for (const rid of RETIRED_IDS) {
    if (actualIds.has(rid)) errors.push(`${rid} is retired and must never be reintroduced`);
  }

  // 99 unique external IDs
  if (actualIds.size !== venues.length) errors.push("Duplicate external IDs");

  // 99 unique slugs
  const slugs = new Set(venues.map((v) => v.slug));
  if (slugs.size !== venues.length) errors.push("Duplicate slugs");

  // BLK-0038 identity
  const blk38 = venues.find((v) => v.external_id === "BLK-0038");
  if (blk38) {
    if (blk38.name !== "OASIS SPORTS CITY") {
      errors.push(`BLK-0038 name: expected 'OASIS SPORTS CITY', got '${blk38.name}'`);
    }
  } else {
    errors.push("BLK-0038 not found");
  }

  // BLK-0100 identity
  const blk100 = venues.find((v) => v.external_id === "BLK-0100");
  if (blk100) {
    const expected = "LE M SPA \u2013 Hammam & Massage Spa Casablanca";
    if (blk100.name !== expected) {
      errors.push(`BLK-0100 name: expected '${expected}', got '${blk100.name}'`);
    }
  } else {
    errors.push("BLK-0100 not found");
  }

  // 97 Google Maps hyperlink targets
  const mapsCount = venues.filter((v) => v.google_maps_url).length;
  if (mapsCount !== 97) errors.push(`Google Maps URLs: expected 97, got ${mapsCount}`);

  // Contact information validation
  const contacts = venues.map((v) => v.contact_information);
  const stringContacts = contacts.filter((c) => typeof c === "string");
  if (stringContacts.length !== 97) {
    errors.push(`String contacts: expected 97, got ${stringContacts.length}`);
  }

  const unknownContacts = venues.filter((v) => v.contact_information === "Unknown");
  if (unknownContacts.length !== 4) {
    errors.push(`Unknown contacts: expected 4, got ${unknownContacts.length}`);
  }

  const unknownIds = new Set(unknownContacts.map((v) => v.external_id));
  for (const id of UNKNOWN_CONTACT_IDS) {
    if (!unknownIds.has(id)) errors.push(`Expected Unknown contact for ${id}`);
  }

  const nonUnknown = contacts.filter((c) => c !== "Unknown");
  if (nonUnknown.length !== 93) {
    errors.push(`Non-Unknown contacts: expected 93, got ${nonUnknown.length}`);
  }

  const nullContacts = contacts.filter((c) => c === null || c === undefined);
  if (nullContacts.length !== 0) {
    errors.push(`Null contacts: expected 0, got ${nullContacts.length}`);
  }

  // Audience arrays non-empty
  for (const v of venues) {
    if (!v.audience_tags || v.audience_tags.length === 0) {
      errors.push(`${v.external_id}: empty audience_tags`);
    }
  }

  // Atmosphere arrays non-empty
  for (const v of venues) {
    if (!v.atmosphere_tags || v.atmosphere_tags.length === 0) {
      errors.push(`${v.external_id}: empty atmosphere_tags`);
    }
  }

  // Experience descriptions non-empty
  for (const v of venues) {
    if (!v.experience_description) {
      errors.push(`${v.external_id}: empty experience_description`);
    }
  }

  // Indoor/Outdoor values
  for (const v of venues) {
    if (v.indoor_outdoor && !VALID_INDOOR_OUTDOOR.has(v.indoor_outdoor)) {
      errors.push(`${v.external_id}: invalid indoor_outdoor: ${v.indoor_outdoor}`);
    }
  }

  // Price fields NULL
  for (const v of venues) {
    if (v.price !== null) errors.push(`${v.external_id}: price must be null`);
    if (v.price_details !== null) errors.push(`${v.external_id}: price_details must be null`);
    if (v.price_level !== null) errors.push(`${v.external_id}: price_level must be null`);
  }

  // lat/lng NULL
  for (const v of venues) {
    if (v.lat !== null) errors.push(`${v.external_id}: lat must be null`);
    if (v.lng !== null) errors.push(`${v.external_id}: lng must be null`);
  }

  // Verification fields
  for (const v of venues) {
    if (v.research_status !== "Verified") {
      errors.push(`${v.external_id}: research_status must be 'Verified'`);
    }
    if (v.verification_level !== "publicly_researched") {
      errors.push(`${v.external_id}: verification_level must be 'publicly_researched'`);
    }
  }

  // is_active
  for (const v of venues) {
    if (v.is_active !== true) errors.push(`${v.external_id}: is_active must be true`);
  }

  // No slug "--"
  for (const v of venues) {
    if (v.slug.includes("--")) errors.push(`${v.external_id}: slug has '--': ${v.slug}`);
  }

  return { valid: errors.length === 0, errors };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isConfirmReplace = args.includes("--confirm-replace");

  if (!isDryRun && !isConfirmReplace) {
    console.error("Usage: tsx scripts/importV3Venues.ts --dry-run");
    console.error("       tsx scripts/importV3Venues.ts --confirm-replace");
    process.exit(1);
  }

  // Find payload file
  let payloadPath = "";
  const payloadIdx = args.indexOf("--payload");
  if (payloadIdx !== -1 && args[payloadIdx + 1]) {
    payloadPath = args[payloadIdx + 1];
  } else {
    // Default: look in scripts/ relative to repo root
    payloadPath = path.resolve(__dirname, "..", "..", "scripts", "v3_venues_payload.json");
  }

  console.log("─".repeat(60));
  console.log("Blaniko V3 Venue Import");
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "CONFIRM REPLACE"}`);
  console.log(`Payload: ${payloadPath}`);
  console.log("─".repeat(60));

  // Read payload
  if (!fs.existsSync(payloadPath)) {
    console.error(`\nERROR: Payload file not found: ${payloadPath}`);
    console.error("Run the extractor first: python3 scripts/extract_v3_to_json.py");
    process.exit(1);
  }

  const raw = fs.readFileSync(payloadPath, "utf-8");
  let venues: V3Venue[];
  try {
    venues = JSON.parse(raw) as V3Venue[];
  } catch (e) {
    console.error(`\nERROR: Invalid JSON in ${payloadPath}`);
    process.exit(1);
  }

  console.log(`\nLoaded ${venues.length} venues from payload`);

  // Validate
  console.log("\nRunning validation...");
  const { valid, errors } = validate(venues);

  if (!valid) {
    console.error(`\n${"=".repeat(60)}`);
    console.error(`VALIDATION FAILED — ${errors.length} error(s):`);
    for (const e of errors) {
      console.error(`  ✗ ${e}`);
    }
    console.error(`${"=".repeat(60)}`);
    process.exit(1);
  }

  // Print validation summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("VALIDATION PASSED — all checks OK");
  console.log(`  ✓ ${venues.length} venues`);
  console.log("  ✓ Exact ID set (BLK-0001..BLK-0036, BLK-0038..BLK-0100, minus retired BLK-0020/BLK-0044)");
  console.log("  ✓ BLK-0037 absent; BLK-0020 & BLK-0044 retired");
  console.log("  ✓ 97 unique external IDs");
  console.log("  ✓ 97 unique slugs");
  console.log("  ✓ BLK-0038 = OASIS SPORTS CITY");
  console.log("  ✓ BLK-0100 = LE M SPA identity confirmed");
  console.log("  ✓ 97 Google Maps hyperlink targets");
  console.log("  ✓ 97 contact strings (4 Unknown, 93 non-Unknown, 0 null)");
  console.log("  ✓ All audience/atmosphere arrays non-empty");
  console.log("  ✓ All experience descriptions non-empty");
  console.log("  ✓ Indoor/Outdoor values valid");
  console.log("  ✓ price/price_details/price_level all NULL");
  console.log("  ✓ lat/lng all NULL");
  console.log("  ✓ Verification fields correct");
  console.log("  ✓ is_active=true on all venues");
  console.log("  ✓ No slugs contain '--'");
  console.log(`${"=".repeat(60)}`);

  // Category breakdown
  const catCounts: Record<string, number> = {};
  for (const v of venues) {
    catCounts[v.category] = (catCounts[v.category] ?? 0) + 1;
  }
  console.log("\nCategory breakdown:");
  for (const [cat, count] of Object.entries(catCounts).sort()) {
    console.log(`  ${cat}: ${count}`);
  }

  // Indoor/Outdoor breakdown
  const ioCounts: Record<string, number> = {};
  for (const v of venues) {
    const io = v.indoor_outdoor ?? "null";
    ioCounts[io] = (ioCounts[io] ?? 0) + 1;
  }
  console.log("\nIndoor/Outdoor breakdown:");
  for (const [io, count] of Object.entries(ioCounts).sort()) {
    console.log(`  ${io}: ${count}`);
  }

  // Sample venues
  console.log("\nSample venues (first 5):");
  for (const v of venues.slice(0, 5)) {
    console.log(`  ${v.external_id}  ${v.name.padEnd(35)}  ${v.slug}`);
    console.log(`    category: ${v.category} / ${v.subcategory ?? "—"}`);
    console.log(`    contact: ${v.contact_information}`);
    console.log(`    audience: ${v.audience_tags.join(", ")}`);
    console.log(`    atmosphere: ${v.atmosphere_tags.join(", ")}`);
    console.log();
  }

  if (isDryRun) {
    console.log("\n✓ DRY RUN complete. Payload is valid and ready for import.");
    console.log("  To perform the actual replacement, run with --confirm-replace");
    return;
  }

  // ─── Live replacement ──────────────────────────────────────────────────────

  if (isConfirmReplace) {
    // ─── Step 0: HARD image-safety guard (runs before everything else) ────────
    // The V3 replace path DELETEs every venue row and re-INSERTs from the
    // payload — which carries image_url = null and no detail_image_url column.
    // If any production venue currently has a live image, replacement would
    // destroy it. This guard performs its OWN read-only check and aborts, so it
    // keeps protecting live images even if a future developer changes the
    // legacy-count / identity guards below or re-creates the replace_venues_v3
    // RPC. It is intentionally NOT overridable by --confirm-replace and has no
    // bypass flag.
    console.log("\n[image-safety] Checking for live venue images before replacement...");
    const { data: imageRows, error: imageErr } = await supabase
      .from("venues")
      .select("external_id, image_url, detail_image_url");

    if (imageErr) {
      console.error(`\nERROR: image-safety pre-flight read failed: ${imageErr.message}`);
      console.error("ABORTING — cannot verify image safety, so replacement is blocked.");
      process.exit(1);
    }

    const withCard = (imageRows ?? []).filter((v) => v.image_url != null).length;
    const withDetail = (imageRows ?? []).filter((v) => v.detail_image_url != null).length;

    if (withCard > 0 || withDetail > 0) {
      console.error(`\n${"!".repeat(60)}`);
      console.error("REPLACEMENT BLOCKED — LIVE VENUE IMAGES DETECTED");
      console.error(`${"!".repeat(60)}`);
      console.error(`  ${withCard} venue(s) have a non-null image_url`);
      console.error(`  ${withDetail} venue(s) have a non-null detail_image_url`);
      console.error("");
      console.error("  Production contains live venue images. This replacement importer");
      console.error("  deletes and re-inserts every venue from the payload and does NOT");
      console.error("  guarantee preservation of image_url/detail_image_url (the extractor");
      console.error("  emits image_url = null and there is no detail_image_url in the payload).");
      console.error("  Running it would wipe live production images.");
      console.error("");
      console.error("  Replacement is blocked until image-preserving import behavior is");
      console.error("  implemented (e.g. an upsert by external_id that never overwrites the");
      console.error("  image columns, or a snapshot+restore of image_url/detail_image_url");
      console.error("  around the replace). There is intentionally NO bypass flag.");
      console.error(`${"!".repeat(60)}`);
      process.exit(1);
    }

    console.log("  ✓ No live venue images found — image-safety guard passed.");

    // Step 3: Supabase service-role client already imported at top level.

    // Step 4: Read current production venues BEFORE replacement.
    console.log("\nReading current production venues...");
    const { data: currentVenues, error: readError } = await supabase
      .from("venues")
      .select("*");

    if (readError) {
      console.error(`\nERROR: Failed to read current venues: ${readError.message}`);
      process.exit(1);
    }

    if (!currentVenues || currentVenues.length !== 47) {
      console.error(`\nERROR: Expected exactly 47 current venues, found ${currentVenues?.length ?? 0}`);
      console.error("This is a re-run guard. The replacement may have already been applied.");
      console.error("ABORTING — RPC was NOT called.");
      process.exit(1);
    }

    console.log(`  ✓ Found exactly ${currentVenues.length} current venues`);

    // Verify legacy-state identities
    const legacyChecks: Array<{ id: string; expectedName: string }> = [
      { id: "BLK-0001", expectedName: "Astropool Lounge" },
      { id: "BLK-0026", expectedName: "OASIS SPORTS CITY" },
      { id: "BLK-0049", expectedName: "Basket Atlantic hank" },
    ];

    for (const check of legacyChecks) {
      const venue = currentVenues.find((v: { external_id: string }) => v.external_id === check.id);
      if (!venue) {
        console.error(`\nERROR: Legacy identity check failed — ${check.id} not found in current venues`);
        console.error("ABORTING — RPC was NOT called.");
        process.exit(1);
      }
      if (venue.name !== check.expectedName) {
        console.error(`\nERROR: Legacy identity check failed — ${check.id} name is '${venue.name}', expected '${check.expectedName}'`);
        console.error("Database may already be migrated.");
        console.error("ABORTING — RPC was NOT called.");
        process.exit(1);
      }
      console.log(`  ✓ ${check.id} = ${check.expectedName}`);
    }

    // Step 5: Create backup of all 47 venue rows.
    const backupDir = path.resolve(__dirname, "..", "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFilename = `pre-v3-venues-${timestamp}.json`;
    const backupPath = path.join(backupDir, backupFilename);

    fs.writeFileSync(backupPath, JSON.stringify(currentVenues, null, 2), "utf-8");

    // Verify backup by reading it back
    const backupRaw = fs.readFileSync(backupPath, "utf-8");
    const backupParsed = JSON.parse(backupRaw);
    if (!Array.isArray(backupParsed) || backupParsed.length !== 47) {
      console.error(`\nERROR: Backup verification failed — expected 47 rows, parsed ${Array.isArray(backupParsed) ? backupParsed.length : "non-array"}`);
      console.error("ABORTING — RPC was NOT called.");
      process.exit(1);
    }

    console.log(`  ✓ Backup written and verified: ${backupPath}`);

    // Step 6: Record pre-replacement dependent-data counts.
    const { count: favCountPre, error: favErr } = await supabase
      .from("user_favorites")
      .select("*", { count: "exact", head: true });

    if (favErr) {
      console.error(`\nERROR: Failed to count user_favorites: ${favErr.message}`);
      process.exit(1);
    }

    const { count: claimsCountPre, error: claimsErr } = await supabase
      .from("venue_claims")
      .select("*", { count: "exact", head: true });

    if (claimsErr) {
      console.error(`\nERROR: Failed to count venue_claims: ${claimsErr.message}`);
      process.exit(1);
    }

    console.log(`  ✓ Pre-replacement user_favorites: ${favCountPre}`);
    console.log(`  ✓ Pre-replacement venue_claims: ${claimsCountPre}`);

    // Step 7: Final warning.
    console.log(`\n${"=".repeat(60)}`);
    console.log(`⚠  About to atomically replace existing production venues with ${venues.length} V3 venues.`);
    console.log(`${"=".repeat(60)}`);

    // Step 8: Call the RPC.
    console.log("\nCalling replace_venues_v3 RPC...");
    const { error: rpcError } = await supabase.rpc("replace_venues_v3", {
      payload: venues,
    });

    // Step 9: Handle RPC failure.
    if (rpcError) {
      console.error(`\n${"!".repeat(60)}`);
      console.error("REPLACEMENT FAILED — DATABASE TRANSACTION ROLLED BACK");
      console.error(`Error: ${rpcError.message}`);
      if (rpcError.details) console.error(`Details: ${rpcError.details}`);
      if (rpcError.hint) console.error(`Hint: ${rpcError.hint}`);
      console.error(`${"!".repeat(60)}`);
      process.exit(1);
    }

    console.log("  ✓ RPC returned success");

    // Step 10: Post-flight validation.
    console.log("\nRunning post-flight validation...");
    const postFlightErrors: string[] = [];

    const { data: newVenues, error: postReadErr } = await supabase
      .from("venues")
      .select("*");

    if (postReadErr) {
      console.error(`\nERROR: Post-flight read failed: ${postReadErr.message}`);
      process.exit(1);
    }

    // venues count = 97
    if (!newVenues || newVenues.length !== 97) {
      postFlightErrors.push(`Venue count: expected 97, got ${newVenues?.length ?? 0}`);
    }

    if (newVenues && newVenues.length > 0) {
      const postIds = new Set(newVenues.map((v: { external_id: string }) => v.external_id));

      // Exact ID set
      for (const expected of EXPECTED_IDS) {
        if (!postIds.has(expected)) postFlightErrors.push(`Missing ID: ${expected}`);
      }
      for (const actual of postIds) {
        if (!EXPECTED_IDS.has(actual)) postFlightErrors.push(`Unexpected ID: ${actual}`);
      }

      // BLK-0037 absent
      if (postIds.has("BLK-0037")) postFlightErrors.push("BLK-0037 should be absent");

      // BLK-0038 identity
      const post38 = newVenues.find((v: { external_id: string }) => v.external_id === "BLK-0038");
      if (!post38 || post38.name !== "OASIS SPORTS CITY") {
        postFlightErrors.push(`BLK-0038: expected 'OASIS SPORTS CITY', got '${post38?.name}'`);
      }

      // BLK-0100 identity
      const post100 = newVenues.find((v: { external_id: string }) => v.external_id === "BLK-0100");
      const expectedName100 = "LE M SPA \u2013 Hammam & Massage Spa Casablanca";
      if (!post100 || post100.name !== expectedName100) {
        postFlightErrors.push(`BLK-0100: expected '${expectedName100}', got '${post100?.name}'`);
      }

      // 97 unique external IDs
      if (postIds.size !== 97) postFlightErrors.push(`Unique external IDs: expected 97, got ${postIds.size}`);

      // 97 unique slugs
      const postSlugs = new Set(newVenues.map((v: { slug: string }) => v.slug));
      if (postSlugs.size !== 97) postFlightErrors.push(`Unique slugs: expected 97, got ${postSlugs.size}`);

      // Retired venues must never reappear post-flight
      for (const rid of RETIRED_IDS) {
        if (postIds.has(rid)) postFlightErrors.push(`${rid} is retired and must never be present`);
      }

      // 0 null contact_information
      const nullContacts = newVenues.filter((v: { contact_information: string | null }) => v.contact_information === null).length;
      if (nullContacts !== 0) postFlightErrors.push(`Null contact_information: expected 0, got ${nullContacts}`);

      // exactly 4 contact_information == "Unknown"
      const unknownContacts = newVenues.filter((v: { contact_information: string }) => v.contact_information === "Unknown");
      if (unknownContacts.length !== 4) {
        postFlightErrors.push(`Unknown contacts: expected 4, got ${unknownContacts.length}`);
      }

      // Unknown IDs exact
      const actualUnknownIds = new Set(unknownContacts.map((v: { external_id: string }) => v.external_id));
      for (const uid of UNKNOWN_CONTACT_IDS) {
        if (!actualUnknownIds.has(uid)) postFlightErrors.push(`Expected Unknown contact for ${uid}`);
      }

      // price/price_details/price_level all null
      const priceNonNull = newVenues.filter((v: { price: unknown }) => v.price !== null).length;
      if (priceNonNull !== 0) postFlightErrors.push(`price non-null: expected 0, got ${priceNonNull}`);

      const priceDetailsNonNull = newVenues.filter((v: { price_details: unknown }) => v.price_details !== null).length;
      if (priceDetailsNonNull !== 0) postFlightErrors.push(`price_details non-null: expected 0, got ${priceDetailsNonNull}`);

      const priceLevelNonNull = newVenues.filter((v: { price_level: unknown }) => v.price_level !== null).length;
      if (priceLevelNonNull !== 0) postFlightErrors.push(`price_level non-null: expected 0, got ${priceLevelNonNull}`);

      // lat/lng all null
      const latNonNull = newVenues.filter((v: { lat: unknown }) => v.lat !== null).length;
      if (latNonNull !== 0) postFlightErrors.push(`lat non-null: expected 0, got ${latNonNull}`);

      const lngNonNull = newVenues.filter((v: { lng: unknown }) => v.lng !== null).length;
      if (lngNonNull !== 0) postFlightErrors.push(`lng non-null: expected 0, got ${lngNonNull}`);

      // all is_active = true
      const inactiveCount = newVenues.filter((v: { is_active: boolean }) => v.is_active !== true).length;
      if (inactiveCount !== 0) postFlightErrors.push(`Inactive venues: expected 0, got ${inactiveCount}`);

      // all source = "v3_import"
      const wrongSource = newVenues.filter((v: { source: string }) => v.source !== "v3_import").length;
      if (wrongSource !== 0) postFlightErrors.push(`Venues with wrong source: expected 0, got ${wrongSource}`);

      // all research_status = "Verified"
      const wrongResearch = newVenues.filter((v: { research_status: string }) => v.research_status !== "Verified").length;
      if (wrongResearch !== 0) postFlightErrors.push(`Venues with wrong research_status: expected 0, got ${wrongResearch}`);

      // all verification_level = "publicly_researched"
      const wrongVerification = newVenues.filter((v: { verification_level: string }) => v.verification_level !== "publicly_researched").length;
      if (wrongVerification !== 0) postFlightErrors.push(`Venues with wrong verification_level: expected 0, got ${wrongVerification}`);
    }

    // user_favorites = 0
    const { count: favCountPost, error: favErrPost } = await supabase
      .from("user_favorites")
      .select("*", { count: "exact", head: true });

    if (favErrPost) {
      postFlightErrors.push(`Failed to count post user_favorites: ${favErrPost.message}`);
    } else if (favCountPost !== 0) {
      postFlightErrors.push(`Post user_favorites: expected 0, got ${favCountPost}`);
    }

    // venue_claims must equal pre-replacement count
    const { count: claimsCountPost, error: claimsErrPost } = await supabase
      .from("venue_claims")
      .select("*", { count: "exact", head: true });

    if (claimsErrPost) {
      postFlightErrors.push(`Failed to count post venue_claims: ${claimsErrPost.message}`);
    } else if (claimsCountPost !== claimsCountPre) {
      postFlightErrors.push(`Post venue_claims: expected ${claimsCountPre} (pre-replacement), got ${claimsCountPost}`);
    }

    // Step 11: Handle post-flight failures.
    if (postFlightErrors.length > 0) {
      console.error(`\n${"!".repeat(60)}`);
      console.error("POST-FLIGHT VALIDATION FAILED");
      console.error(`${"!".repeat(60)}`);
      for (const e of postFlightErrors) {
        console.error(`  ✗ ${e}`);
      }
      console.error(`\nBackup available at: ${backupPath}`);
      console.error("Manual recovery may be required.");
      process.exit(1);
    }

    // Step 12: Success.
    console.log(`\n${"=".repeat(60)}`);
    console.log("V3 PRODUCTION REPLACEMENT COMPLETE");
    console.log(`Replaced legacy venues → ${venues.length} authoritative V3 venues`);
    console.log("All post-flight checks passed.");
    console.log(`Backup: ${backupPath}`);
    console.log(`${"=".repeat(60)}`);
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
