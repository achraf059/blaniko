/**
 * Resolves the image src for a venue.
 *
 * Priority chain:
 *  1. venue.imageUrl   — explicit URL (e.g. Supabase Storage public URL set in the DB)
 *  2. /images/venues/{externalId}.webp — static file served from frontend/public/
 *  3. undefined — VenueImage will render the category gradient placeholder
 *
 * Venues with no real photo have no file in public/images/venues/. VenueImage's
 * onError handler catches the 404 and falls back to the category gradient
 * placeholder automatically.
 *
 * When the backend is migrated to serve all image_url values from Supabase Storage,
 * step 1 will handle everything and step 2 becomes the offline/local fallback.
 */

export function getVenueImageSrc(venue: {
  imageUrl?: string;
  externalId?: string;
}): string | undefined {
  if (venue.imageUrl) return venue.imageUrl;
  if (venue.externalId) return `/images/venues/${venue.externalId}.webp`;
  return undefined;
}

/**
 * External IDs that have a confirmed static image file in public/images/venues/.
 * Used for ordering only — does not affect which URL is returned by getVenueImageSrc.
 * Update this set whenever a new image file is added to public/images/venues/.
 */
const STATIC_IMAGE_IDS = new Set([
  "BLK-0002", "BLK-0004", "BLK-0005", "BLK-0006", "BLK-0007", "BLK-0008",
  "BLK-0010", "BLK-0011", "BLK-0012", "BLK-0013", "BLK-0014", "BLK-0015",
  "BLK-0016", "BLK-0017", "BLK-0019", "BLK-0020", "BLK-0021", "BLK-0022",
  "BLK-0023", "BLK-0024", "BLK-0025", "BLK-0026", "BLK-0027", "BLK-0028",
  "BLK-0029", "BLK-0030", "BLK-0031", "BLK-0032", "BLK-0033", "BLK-0034",
  "BLK-0035", "BLK-0036", "BLK-0038", "BLK-0039", "BLK-0040", "BLK-0041",
  "BLK-0042", "BLK-0043", "BLK-0044", "BLK-0045", "BLK-0046", "BLK-0047",
  "BLK-0048", "BLK-0049",
]);

/**
 * Returns true if the venue has a confirmed real image that will display without
 * falling back to the "Photo coming soon" placeholder.
 *
 * Checks:
 *  1. venue.imageUrl is set (explicit Supabase Storage URL — always real)
 *  2. venue.externalId is in the known static-file set (file exists in public/images/venues/)
 *
 * Used for ordering heuristics only; does not affect image display logic.
 */
export function hasVenueImage(venue: {
  imageUrl?: string | null;
  externalId?: string;
}): boolean {
  if (venue.imageUrl) return true;
  if (venue.externalId && STATIC_IMAGE_IDS.has(venue.externalId)) return true;
  return false;
}
