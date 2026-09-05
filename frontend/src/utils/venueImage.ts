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

/**
 * Resolves the large hero/detail image src for a venue (VenuePage only).
 *
 * Priority:
 *  1. venue.detailImageUrl — explicit hero image
 *  2. venue.imageUrl        — fall back to the card image
 *  3. undefined             — VenueImage renders the "Photo coming soon" placeholder
 *
 * Venue cards keep using getVenueImageSrc() (imageUrl only) — they must not use
 * the detail image.
 */
export function getVenueDetailImageSrc(venue: {
  detailImageUrl?: string | null;
  imageUrl?: string | null;
  externalId?: string;
}): string | undefined {
  if (venue.detailImageUrl) return venue.detailImageUrl;
  if (venue.imageUrl) return venue.imageUrl;
  return undefined;
}
