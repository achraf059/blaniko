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

function toArea(
  neighborhood: string | null,
  region: string | null
): string {
  if (neighborhood && region) return `${neighborhood}, ${region}`;
  if (neighborhood) return neighborhood;
  if (region) return region;
  return "Casablanca";
}

// Shape returned to the frontend for every venue.
function mapVenue(row: Record<string, unknown>) {
  const category = String(row.category ?? "");
  const subcategory = row.subcategory ? String(row.subcategory) : null;
  const neighborhood = row.neighborhood ? String(row.neighborhood) : null;
  const region = row.region ? String(row.region) : null;
  const shortDescription = row.short_description
    ? String(row.short_description)
    : String(row.name ?? "");

  return {
    id: row.id,
    externalId: row.external_id,
    name: row.name,
    slug: row.slug,
    // Keep DB category as-is for reference, also expose derived slug
    category,
    categorySlug: toCategorySlug(category, subcategory),
    subcategory,
    region,
    neighborhood,
    // Compose area string the same way the old mock data did
    area: toArea(neighborhood, region),
    address: row.address ?? null,
    googleMapsLink: row.google_maps_link ?? null,
    phone: row.phone ?? null,
    shortDescription,
    // description mirrors shortDescription so existing components don't break
    description: shortDescription,
    imageUrl: row.image_url ?? null,
    isActive: row.is_active,
    source: row.source,
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
