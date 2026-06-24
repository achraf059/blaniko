import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

// Maps a DB category + subcategory to the frontend categorySlug used for routing.
function toCategorySlug(category: string, subcategory: string | null): string {
  const subcategoryMap: Record<string, string> = {
    // Physical / group activities → activities
    billiards: "activities",
    "escape room": "activities",
    karting: "activities",
    bowling: "activities",
    "laser game": "activities",
    // Digital / screen gaming → gaming
    "gaming / arcade": "gaming",
    "gaming/arcade": "gaming",
    arcade: "gaming",
    // Sports → sports
    padel: "sports",
    football: "sports",
    basketball: "sports",
    // Outdoor / water → outdoor
    "outdoor amusement": "outdoor",
    "beach club": "outdoor",
    "pool / beach club": "outdoor",
    // Family / kids → family
    "indoor play": "family",
    "theme park": "family",
  };

  const categoryMap: Record<string, string> = {
    "friend group activity": "activities",
    sports: "sports",
    "amusement park": "family",
    "pool / beach club": "outdoor",
  };

  if (subcategory) {
    const key = subcategory.toLowerCase().trim();
    if (subcategoryMap[key]) return subcategoryMap[key];
  }

  const key = category.toLowerCase().trim();
  return (
    categoryMap[key] ??
    category
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

type TimeOfDaySlot = "morning" | "afternoon" | "evening" | "late-night";

function computeBestForTags(subcategory: string | null, categorySlug: string): string[] {
  const sub = (subcategory ?? "").toLowerCase().trim();
  if (sub === "billiards")              return ["friends", "late-night", "group-activity"];
  if (sub === "escape room")            return ["friends", "group-activity", "date-spot"];
  if (sub === "karting")                return ["friends", "group-activity", "active"];
  if (sub === "bowling")                return ["friends", "group-activity", "date-spot"];
  if (sub === "laser game")             return ["friends", "group-activity", "active"];
  if (sub.includes("gaming"))           return ["friends", "late-night", "group-activity"];
  if (sub === "padel")                  return ["friends", "active", "competitive"];
  if (sub === "football")               return ["friends", "active", "competitive"];
  if (sub === "basketball")             return ["friends", "active"];
  if (sub === "outdoor amusement")      return ["family-friendly", "kids", "budget-pick"];
  if (sub === "indoor play")            return ["family-friendly", "kids"];
  if (sub === "theme park")             return ["family-friendly", "kids", "active"];
  if (sub.includes("beach club"))       return ["friends", "date-spot", "sunset-spot"];
  // categorySlug fallback
  if (categorySlug === "sports")        return ["friends", "active"];
  if (categorySlug === "gaming")        return ["friends", "late-night"];
  if (categorySlug === "family")        return ["family-friendly", "kids"];
  if (categorySlug === "outdoor")       return ["friends", "budget-pick"];
  return ["friends", "group-activity"];
}

function computeSpaceType(subcategory: string | null): "indoor" | "outdoor" | "mixed" {
  const sub = (subcategory ?? "").toLowerCase().trim();
  if (sub === "billiards")         return "indoor";
  if (sub === "escape room")       return "indoor";
  if (sub === "bowling")           return "indoor";
  if (sub === "laser game")        return "indoor";
  if (sub.includes("gaming"))      return "indoor";
  if (sub === "padel")             return "indoor";
  if (sub === "indoor play")       return "indoor";
  if (sub === "karting")           return "outdoor";
  if (sub === "football")          return "outdoor";
  if (sub === "basketball")        return "outdoor";
  if (sub === "outdoor amusement") return "outdoor";
  if (sub.includes("beach club"))  return "outdoor";
  if (sub === "theme park")        return "mixed";
  return "indoor";
}

function computeTimeOfDay(subcategory: string | null): TimeOfDaySlot[] {
  const sub = (subcategory ?? "").toLowerCase().trim();
  if (sub === "billiards")         return ["evening", "late-night"];
  if (sub === "escape room")       return ["afternoon", "evening"];
  if (sub === "karting")           return ["afternoon", "evening"];
  if (sub === "bowling")           return ["afternoon", "evening"];
  if (sub === "laser game")        return ["afternoon", "evening"];
  if (sub.includes("gaming"))      return ["afternoon", "evening", "late-night"];
  if (sub === "padel")             return ["morning", "afternoon", "evening"];
  if (sub === "football")          return ["afternoon", "evening"];
  if (sub === "basketball")        return ["afternoon", "evening"];
  if (sub === "outdoor amusement") return ["afternoon"];
  if (sub === "indoor play")       return ["morning", "afternoon"];
  if (sub === "theme park")        return ["afternoon"];
  if (sub.includes("beach club"))  return ["afternoon", "evening"];
  return ["afternoon", "evening"];
}

function toArea(
  neighborhood: string | null,
  region: string | null
): string {
  // Exclude "Not confirmed" placeholder values — fall back to region instead.
  const confirmedNeighborhood =
    neighborhood && !neighborhood.toLowerCase().startsWith("not confirmed")
      ? neighborhood
      : null;

  if (confirmedNeighborhood) return confirmedNeighborhood;
  if (region) return region;
  return "Casablanca";
}

// Shape returned to the frontend for every venue.
function mapVenue(row: Record<string, unknown>) {
  const category = String(row.category ?? "");
  const subcategory = row.subcategory ? String(row.subcategory) : null;
  const rawNeighborhood = row.neighborhood ? String(row.neighborhood) : null;
  // Strip "Not confirmed" placeholder values — treat as unknown neighborhood.
  const neighborhood = rawNeighborhood && !rawNeighborhood.toLowerCase().startsWith("not confirmed")
    ? rawNeighborhood
    : null;
  const region = row.region ? String(row.region) : null;
  const shortDescription = row.short_description
    ? String(row.short_description)
    : String(row.name ?? "");

  const categorySlug = toCategorySlug(category, subcategory);

  // Use DB-stored tags if present; otherwise compute from subcategory.
  const dbTags = Array.isArray(row.best_for_tags) && (row.best_for_tags as string[]).length > 0
    ? (row.best_for_tags as string[])
    : null;

  // Map lat/lng from Supabase to the frontend `coordinates` field.
  // Requires `lat` and `lng` columns (DOUBLE PRECISION, nullable) on the
  // `venues` table. Until those columns exist and are populated, this will
  // always be undefined and MapPage will show an empty map canvas.
  //
  // Supabase migration to run when ready:
  //   ALTER TABLE venues ADD COLUMN IF NOT EXISTS lat  DOUBLE PRECISION;
  //   ALTER TABLE venues ADD COLUMN IF NOT EXISTS lng  DOUBLE PRECISION;
  // Casablanca bounding box: lat 33.46–33.66, lng -7.75–-7.45
  const coordinates =
    typeof row.lat === "number" && typeof row.lng === "number"
      ? { lat: row.lat as number, lng: row.lng as number }
      : undefined;

  // price_level should be "$", "$$", or "$$$" in the DB.
  // If the column is missing or null, priceLevel will be undefined and the
  // frontend budget filter will simply not match this venue.
  const priceLevel = row.price_level ? String(row.price_level) : undefined;

  return {
    id: row.id,
    externalId: row.external_id,
    name: row.name,
    slug: row.slug,
    // Keep DB category as-is for reference, also expose derived slug
    category,
    categorySlug,
    subcategory,
    region,
    neighborhood,
    // Compose area string the same way the old mock data did
    area: toArea(neighborhood, region),
    address: row.address && !String(row.address).toLowerCase().startsWith("not confirmed")
      ? row.address
      : null,
    googleMapsLink: row.google_maps_link ?? null,
    phone: row.phone ?? null,
    website: row.website ? String(row.website) : null,
    instagram: row.instagram ? String(row.instagram) : null,
    shortDescription,
    // description mirrors shortDescription so existing components don't break
    description: shortDescription,
    overview:  row.overview  ? String(row.overview)  : undefined,
    vibe:      row.vibe      ? String(row.vibe)       : undefined,
    audience:  row.audience  ? String(row.audience)   : undefined,
    imageUrl: row.image_url ?? null,
    isActive: row.is_active,
    source: row.source,
    // Discovery metadata — computed from subcategory; overridden by DB values when present
    bestForTags: dbTags ?? computeBestForTags(subcategory, categorySlug),
    spaceType: row.space_type ?? computeSpaceType(subcategory),
    timeOfDay: row.time_of_day ?? computeTimeOfDay(subcategory),
    priceLevel,
    coordinates,
  };
}

// GET /api/venues
// Optional query params: category, subcategory, region
router.get("/", async (req: Request, res: Response) => {
  const { category, subcategory, region } = req.query;

  let query = supabase
    .from("venues")
    .select("*")
    .eq("is_active", true)
    .neq("external_id", "BLK-0037") // duplicate "Dream World" — hidden until resolved in DB
    .order("external_id", { ascending: true });

  if (typeof category === "string" && category.length > 0) {
    query = query.ilike("category", category);
  }
  if (typeof subcategory === "string" && subcategory.length > 0) {
    query = query.ilike("subcategory", subcategory);
  }
  if (typeof region === "string" && region.length > 0) {
    query = query.ilike("region", region);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Venues fetch error:", error.message);
    res.status(500).json({ success: false, error: "server_error" });
    return;
  }

  res.json((data ?? []).map((row) => mapVenue(row as Record<string, unknown>)));
});

// GET /api/venues/:slug
router.get("/:slug", async (req: Request, res: Response) => {
  const { slug } = req.params;

  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .neq("external_id", "BLK-0037")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // PostgREST "no rows" error — venue not found
      res.status(404).json({ success: false, error: "not_found" });
      return;
    }
    console.error("Venue fetch error:", error.message);
    res.status(500).json({ success: false, error: "server_error" });
    return;
  }

  res.json(mapVenue(data as Record<string, unknown>));
});

export default router;
