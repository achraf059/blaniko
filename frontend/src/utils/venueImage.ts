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
