/**
 * Resolves the image src for a venue.
 *
 * Priority chain:
 *  1. venue.imageUrl   — explicit URL (e.g. Supabase Storage public URL set in the DB)
 *  2. /images/venues/{externalId}.png — static file served from frontend/public/
 *  3. undefined — VenueImage will render the category gradient placeholder
 *
 * Venues with no real photo (e.g. BLK-0003, BLK-0009, BLK-0018) have no file in
 * public/images/venues/. VenueImage's onError handler catches the 404 and falls
 * back to the category gradient placeholder automatically.
 *
 * When the backend is migrated to serve all image_url values from Supabase Storage,
 * step 1 will handle everything and step 2 becomes the offline/local fallback.
 */

export function getVenueImageSrc(venue: {
  imageUrl?: string;
  externalId?: string;
}): string | undefined {
  if (venue.imageUrl) return venue.imageUrl;
  if (venue.externalId) return `/images/venues/${venue.externalId}.png`;
  return undefined;
}
