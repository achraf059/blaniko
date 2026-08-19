// Pure helpers for the Explore area/quartier filter.
//
// Extracted from CategoryPage so the derivation + matching rules can be unit
// tested and reused without duplicating logic. These functions carry NO React
// state and NO planner/recommender concerns — the area filter is an explicit
// Explore-only filter and must never influence Smart Planner ranking.

import type { Venue } from "../data/mockData";

type AreaOnly = Pick<Venue, "area">;

// Bare city-level fallback the backend emits when a venue has no known
// neighborhood/region (toArea → "Casablanca"). It represents missing data, so it
// is never offered as a selectable area option, and never used for matching.
const MISSING_AREA_LABEL = "casablanca";

/**
 * Canonical area label for a venue: the first comma-segment of `area`, trimmed.
 * Live V3 data has no comma (e.g. "Aïn Diab"); legacy/mock data is
 * "Aïn Diab, Casablanca" — both resolve to the same canonical label.
 */
export function venueAreaLabel(venue: AreaOnly): string {
  return (venue.area?.split(",")[0] ?? "").trim();
}

/**
 * Sorted, de-duplicated list of real area options present in the given venues.
 * Drops blanks and the generic "Casablanca" missing-data fallback. Canonical
 * accents/spelling are preserved exactly (no normalization of the label itself).
 */
export function deriveAreaOptions(venues: ReadonlyArray<AreaOnly>): string[] {
  const set = new Set<string>();
  for (const venue of venues) {
    const label = venueAreaLabel(venue);
    if (!label) continue;
    if (label.toLowerCase() === MISSING_AREA_LABEL) continue;
    set.add(label);
  }
  return Array.from(set).sort();
}

/**
 * Exact, canonical area match. The sentinel "all" imposes no restriction.
 * Matching is exact on the canonical label — never substring, fuzzy, or nearby.
 */
export function venueMatchesArea(venue: AreaOnly, selectedArea: string): boolean {
  if (selectedArea === "all") return true;
  return venueAreaLabel(venue) === selectedArea;
}
