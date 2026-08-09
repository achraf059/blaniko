/**
 * Resolves the image src for a venue.
 *
 * Priority:
 *  1. venue.imageUrl — explicit URL (e.g. Supabase Storage public URL set in the DB)
 *  2. undefined — VenueImage renders the branded "Photo coming soon" placeholder
 *
 * The legacy static fallback (/images/venues/{externalId}.webp) is disabled because
 * the V3 dataset reassigned BLK IDs, making the old static files unreliable.
 * Static images will be re-audited and re-enabled separately once verified.
 */

export function getVenueImageSrc(venue: {
  imageUrl?: string | null;
  externalId?: string;
}): string | undefined {
  if (venue.imageUrl) return venue.imageUrl;
  return undefined;
}

/**
 * Returns true only when the venue has a trusted, explicit imageUrl.
 *
 * Used for ordering heuristics (e.g. venues with photos first).
 * Does NOT consider static BLK files — those are unverified after the V3 migration.
 */
export function hasVenueImage(venue: {
  imageUrl?: string | null;
  externalId?: string;
}): boolean {
  return !!venue.imageUrl;
}
