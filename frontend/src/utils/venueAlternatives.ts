import { type Venue } from "../data/mockData";
import { getBestForLabel } from "./discoveryFilters";

export type VenueAlternative = {
  venue: Venue;
  reasons: string[];
  score: number;
};

function normalizeText(value: string | undefined): string {
  return (value ?? "").toLowerCase().trim();
}

function primaryArea(area: string): string {
  return area.split(",")[0]?.toLowerCase().trim() ?? normalizeText(area);
}

function overlapCount(valuesA: string[], valuesB: string[]): number {
  const setB = new Set(valuesB);
  let count = 0;

  valuesA.forEach((value) => {
    if (setB.has(value)) {
      count += 1;
    }
  });

  return count;
}

function findVibeOverlap(first: string | undefined, second: string | undefined): string[] {
  const firstWords = normalizeText(first)
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 3);
  const secondSet = new Set(
    normalizeText(second)
      .split(/[^a-z0-9]+/g)
      .filter((token) => token.length > 3)
  );

  return [...new Set(firstWords.filter((word) => secondSet.has(word)))];
}

function uniqueReasons(reasons: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const reason of reasons) {
    const key = reason.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(reason);
  }

  return output;
}

export function rankVenueAlternatives(
  currentVenue: Venue,
  allVenues: Venue[],
  maxItems = 4
): VenueAlternative[] {
  const currentArea = primaryArea(currentVenue.area);
  const currentBestFor = (currentVenue.bestForTags ?? []).map((tag) => tag.trim()).filter(Boolean);
  const currentTimes = currentVenue.timeOfDay ?? [];

  const ranked = allVenues
    .filter((venue) => venue.slug !== currentVenue.slug)
    .map((venue) => {
      const reasons: string[] = [];
      let score = 0;

      const sameArea = primaryArea(venue.area) === currentArea;
      if (sameArea) {
        score += 5;
        reasons.push("Same area");
      }

      if (venue.categorySlug === currentVenue.categorySlug) {
        score += 4;
        reasons.push("Same category");
      }

      if ((venue.priceLevel ?? "") && venue.priceLevel === currentVenue.priceLevel) {
        score += 2;
        reasons.push(`Same budget (${venue.priceLevel})`);
      }

      const venueBestFor = (venue.bestForTags ?? []).map((tag) => tag.trim()).filter(Boolean);
      const bestForOverlap = overlapCount(currentBestFor, venueBestFor);
      if (bestForOverlap > 0) {
        score += bestForOverlap * 2;
        const sharedTag = venueBestFor.find((tag) => currentBestFor.includes(tag));
        if (sharedTag) {
          reasons.push(`Shared fit: ${getBestForLabel(sharedTag)}`);
        }
      }

      const vibeOverlap = findVibeOverlap(currentVenue.vibeSummary ?? currentVenue.vibe, venue.vibeSummary ?? venue.vibe);
      if (vibeOverlap.length > 0) {
        score += 2;
        reasons.push("Similar vibe");
      }

      if (venue.socialLevel && venue.socialLevel === currentVenue.socialLevel) {
        score += 1;
        reasons.push("Similar social energy");
      }

      if (venue.energyLevel && venue.energyLevel === currentVenue.energyLevel) {
        score += 1;
        reasons.push("Similar activity level");
      }

      if (venue.spaceType && venue.spaceType === currentVenue.spaceType) {
        score += 1;
        reasons.push("Similar setting");
      }

      const timeOverlap = overlapCount(currentTimes, venue.timeOfDay ?? []);
      if (timeOverlap > 0) {
        score += 1;
        reasons.push("Good at the same time of day");
      }

      return {
        venue,
        reasons: uniqueReasons(reasons),
        score,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return first.venue.name.localeCompare(second.venue.name);
    });

  if (ranked.length >= maxItems) {
    return ranked.slice(0, maxItems);
  }

  const fallback = allVenues
    .filter(
      (venue) =>
        venue.slug !== currentVenue.slug &&
        (primaryArea(venue.area) === currentArea || venue.categorySlug === currentVenue.categorySlug)
    )
    .map((venue) => ({
      venue,
      reasons: [primaryArea(venue.area) === currentArea ? "Same area" : "Same category"],
      score: 1,
    }))
    .filter((entry) => !ranked.some((existing) => existing.venue.slug === entry.venue.slug));

  return [...ranked, ...fallback].slice(0, maxItems);
}
