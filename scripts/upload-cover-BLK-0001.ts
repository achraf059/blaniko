/**
 * One-off script: upload cover image for BLK-0001 (Astropool Lounge)
 *
 * Usage:
 *   cd ~/blaniko
 *   npx tsx --env-file=backend/.env scripts/upload-cover-BLK-0001.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SECRET_KEY in environment."
  );
  process.exit(1);
}

const BUCKET = "venue-images";
const STORAGE_PATH = "venues/BLK-0001/cover.jpg";
const EXTERNAL_ID = "BLK-0001";
const LOCAL_IMAGE = resolve(homedir(), "blaniko/venue-images/BLK-0001.jpg");

// ── Client ────────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Reading local file: ${LOCAL_IMAGE}`);
  const fileBuffer = readFileSync(LOCAL_IMAGE);

  // 1. Upload to Storage
  console.log(`Uploading to bucket "${BUCKET}" at path "${STORAGE_PATH}"...`);
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(STORAGE_PATH, fileBuffer, {
      contentType: "image/jpeg",
      upsert: true, // overwrite if a previous test upload exists
    });

  if (uploadError) {
    console.error("Upload failed:", uploadError.message);
    process.exit(1);
  }
  console.log("Upload successful.");

  // 2. Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(STORAGE_PATH);

  const publicUrl = urlData.publicUrl;
  console.log(`\nPublic URL:\n  ${publicUrl}\n`);

  // 3. Update venues table
  console.log(
    `Updating public.venues SET image_url WHERE external_id = '${EXTERNAL_ID}'...`
  );
  const { error: updateError } = await supabase
    .from("venues")
    .update({ image_url: publicUrl })
    .eq("external_id", EXTERNAL_ID);

  if (updateError) {
    console.error("DB update failed:", updateError.message);
    process.exit(1);
  }
  console.log("DB update successful.");

  // 4. Confirm
  console.log("\nConfirmation check:");
  const { data: row, error: selectError } = await supabase
    .from("venues")
    .select("external_id, name, image_url")
    .eq("external_id", EXTERNAL_ID)
    .single();

  if (selectError) {
    console.error("Confirmation query failed:", selectError.message);
    process.exit(1);
  }

  console.log("  external_id :", row.external_id);
  console.log("  name        :", row.name);
  console.log("  image_url   :", row.image_url);
  console.log("\nDone.");
}

main();
