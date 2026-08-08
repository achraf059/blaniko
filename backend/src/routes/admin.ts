import { Router, type Request, type Response } from "express";
import { supabase } from "../lib/supabase";
import { adminAuth } from "../middleware/adminAuth";

const router = Router();

// All admin routes require a valid session cookie
router.use(adminAuth);

// ─── Allowed PATCH fields ─────────────────────────────────────────────────────
// Explicit allowlist: camelCase (frontend) → snake_case (DB column).
// Any field NOT in this map will be silently ignored.
const PATCHABLE: Record<string, string> = {
  name:             "name",
  category:         "category",
  subcategory:      "subcategory",
  neighborhood:     "neighborhood",
  address:          "address",
  googleMapsLink:   "google_maps_link",
  phone:            "phone",
  shortDescription: "short_description",
  imageUrl:         "image_url",
  priceLevel:       "price_level",
  lat:              "lat",
  lng:              "lng",
  isActive:         "is_active",
  website:          "website",
  instagram:        "instagram",
  overview:         "overview",
  vibe:             "vibe",
  audience:         "audience",
  // V3 canonical fields
  locationText:           "location_text",
  googleMapsUrl:          "google_maps_url",
  contactInformation:     "contact_information",
  experienceDescription:  "experience_description",
  indoorOutdoor:          "indoor_outdoor",
  facebook:               "facebook",
  openingHoursRaw:        "opening_hours_raw",
  bookingLink:            "booking_link",
  researchStatus:         "research_status",
  verificationLevel:      "verification_level",
  verifiedBy:             "verified_by",
};

// Fields that are TEXT[] arrays in the DB — need special handling
const ARRAY_PATCHABLE: Record<string, string> = {
  audienceTags:           "audience_tags",
  atmosphereTags:         "atmosphere_tags",
  additionalExperiences:  "additional_experiences",
  bookingMethod:          "booking_method",
  bestForTags:            "best_for_tags",
  timeOfDay:              "time_of_day",
};

// ─── GET /api/admin/venues ────────────────────────────────────────────────────
// Returns all venues (including inactive), raw DB rows — no mapVenue() transform.
// Admin needs the raw data including is_active, all DB columns, etc.
router.get("/venues", async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .order("external_id", { ascending: true });

  if (error) {
    console.error("Admin venues fetch error:", error.message);
    res.status(500).json({ success: false, error: "server_error" });
    return;
  }

  res.json(data ?? []);
});

// ─── PATCH /api/admin/venues/:externalId ─────────────────────────────────────
// Updates only the explicitly allowed fields. Rejects unknown fields silently
// (does not error — just ignores them so old clients don't break).
router.patch("/venues/:externalId", async (req: Request, res: Response) => {
  const { externalId } = req.params;

  // Validate ID format to prevent injection via path param
  if (!/^BLK-\d{4}$/.test(externalId)) {
    res.status(400).json({ success: false, error: "invalid_id" });
    return;
  }

  const body: unknown = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    res.status(400).json({ success: false, error: "invalid_body" });
    return;
  }

  const input = body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  for (const [camel, snake] of Object.entries(PATCHABLE)) {
    if (!(camel in input)) continue;

    const val = input[camel];

    // Numeric fields: lat, lng
    if (camel === "lat" || camel === "lng") {
      if (val === null || val === "" || val === undefined) {
        patch[snake] = null;
      } else {
        const n = Number(val);
        if (Number.isNaN(n)) {
          res.status(400).json({ success: false, error: `invalid_${camel}` });
          return;
        }
        patch[snake] = n;
      }
      continue;
    }

    // Boolean field: is_active
    if (camel === "isActive") {
      patch[snake] = val === true || val === "true";
      continue;
    }

    // Enum field: price_level
    if (camel === "priceLevel") {
      if (val !== null && val !== "" && !["$", "$$", "$$$"].includes(String(val))) {
        res.status(400).json({ success: false, error: "invalid_price_level" });
        return;
      }
      patch[snake] = val || null;
      continue;
    }

    // Enum field: indoor_outdoor
    if (camel === "indoorOutdoor") {
      const allowed = ["Indoor", "Outdoor", "Indoor / Outdoor"];
      if (val !== null && val !== "" && !allowed.includes(String(val))) {
        res.status(400).json({ success: false, error: "invalid_indoor_outdoor" });
        return;
      }
      patch[snake] = val || null;
      continue;
    }

    // All other string fields
    if (typeof val === "string") {
      patch[snake] = val.trim() === "" ? null : val.trim();
    } else {
      patch[snake] = null;
    }
  }

  // Handle array fields
  for (const [camel, snake] of Object.entries(ARRAY_PATCHABLE)) {
    if (!(camel in input)) continue;
    const val = input[camel];
    if (val === null || val === undefined) {
      patch[snake] = null;
    } else if (Array.isArray(val)) {
      patch[snake] = val.map((item) => String(item).trim()).filter((s) => s.length > 0);
    } else {
      res.status(400).json({ success: false, error: `invalid_${camel}_must_be_array` });
      return;
    }
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ success: false, error: "no_patchable_fields" });
    return;
  }

  // Append updated_at timestamp
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("venues")
    .update(patch)
    .eq("external_id", externalId)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      res.status(404).json({ success: false, error: "not_found" });
      return;
    }
    console.error(`Admin PATCH ${externalId} error:`, error.message);
    res.status(500).json({ success: false, error: "server_error" });
    return;
  }

  res.json({ success: true, venue: data });
});

export default router;
