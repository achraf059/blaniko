import { type Venue } from "../data/mockData";
import type { AppLanguage } from "../i18n/types";
import { getBestForBadges } from "./venuePersonality";

type CompareCallout = {
  label: string;
  venueSlug: string;
  venueName: string;
};

export type CompareInsights = {
  summary: string;
  insightChips: string[];
  callouts: CompareCallout[];
  standoutByVenue: Record<string, string[]>;
};

// V3 price safety: budgetScore disabled until verified prices exist.
// function budgetScore(value: string | undefined): number | undefined {
//   if (value === "$") return 1;
//   if (value === "$$") return 2;
//   if (value === "$$$") return 3;
//   return undefined;
// }

function socialScore(value: Venue["socialLevel"]): number {
  if (value === "high") {
    return 3;
  }

  if (value === "medium") {
    return 2;
  }

  if (value === "low") {
    return 1;
  }

  return 0;
}

function energyScore(value: Venue["energyLevel"]): number {
  if (value === "high") {
    return 3;
  }

  if (value === "medium") {
    return 2;
  }

  if (value === "low") {
    return 1;
  }

  return 0;
}

function containsAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function venueText(venue: Venue): string {
  return `${venue.description} ${venue.shortDescription ?? ""} ${venue.audience ?? ""} ${
    venue.vibe ?? ""
  }`.toLowerCase();
}

function primaryArea(area: string): string {
  return area.split(",")[0]?.trim() ?? area;
}

function getUniqueWinner<T extends string | number>(
  values: Array<{ venue: Venue; value: T | undefined }>,
  strategy: "min" | "max"
): Venue | undefined {
  const available = values.filter(
    (item): item is { venue: Venue; value: T } => item.value !== undefined
  );

  if (available.length < 2) {
    return undefined;
  }

  const target =
    strategy === "min"
      ? available.reduce((lowest, current) => (current.value < lowest.value ? current : lowest))
      : available.reduce((highest, current) =>
          current.value > highest.value ? current : highest
        );

  const tieCount = available.filter((entry) => entry.value === target.value).length;
  if (tieCount > 1) {
    return undefined;
  }

  return target.venue;
}

function isDateFriendly(venue: Venue): boolean {
  const text = venueText(venue);
  return (
    (venue.bestForTags ?? []).includes("date-spot") ||
    containsAny(text, ["romantic", "date", "couples", "intimate"])
  );
}

function isFriendsFriendly(venue: Venue): boolean {
  const text = venueText(venue);
  return (
    (venue.bestForTags ?? []).includes("friends") ||
    containsAny(text, ["friends", "groups", "social", "gamers"])
  );
}

function isWorkFriendly(venue: Venue): boolean {
  const text = venueText(venue);
  return (
    (venue.bestForTags ?? []).includes("work-friendly") ||
    containsAny(text, ["remote", "freelancer", "focused", "work", "professionals"])
  );
}

function isEveningFriendly(venue: Venue): boolean {
  return (venue.timeOfDay ?? []).includes("evening") || (venue.timeOfDay ?? []).includes("late-night");
}

function pickSingleCandidate(venues: Venue[], predicate: (venue: Venue) => boolean): Venue | undefined {
  const matched = venues.filter(predicate);
  if (matched.length !== 1) {
    return undefined;
  }

  return matched[0];
}

function addStandout(
  map: Record<string, string[]>,
  venueSlug: string,
  label: string
) {
  map[venueSlug] = [...(map[venueSlug] ?? []), label];
}

export function buildCompareInsights(
  venues: Venue[],
  language: AppLanguage = "en",
): CompareInsights {
  const isFr = language === "fr";
  if (venues.length === 0) {
    return {
      summary: isFr
        ? "Ajoutez des lieux à comparer pour obtenir des insights de décision."
        : "Add venues to compare and get decision-oriented insights.",
      insightChips: [],
      callouts: [],
      standoutByVenue: {},
    };
  }

  const areas = [...new Set(venues.map((venue) => primaryArea(venue.area)))];
  const categories = [...new Set(venues.map((venue) => venue.category))];

  const summary =
    venues.length === 1
      ? isFr
        ? `Vous avez un lieu sélectionné à ${areas[0] ?? "Casablanca"}. Ajoutez-en d'autres pour débloquer les insights.`
        : `You have one venue selected in ${areas[0] ?? "Casablanca"}. Add more venues to unlock decision insights.`
      : isFr
        ? `Comparaison de ${venues.length} lieux sur ${categories.length} catégories dans ${areas.length} quartiers.`
        : `Comparing ${venues.length} venues across ${categories.length} categories in ${areas.length} areas.`;

  const insightChips: string[] = [];
  const callouts: CompareCallout[] = [];
  const standoutByVenue: Record<string, string[]> = {};

  // V3 price safety: budget comparison disabled until verified prices exist.
  // const cheapest = getUniqueWinner(
  //   venues.map((venue) => ({ venue, value: budgetScore(venue.priceLevel) })),
  //   "min"
  // );
  // if (cheapest) {
  //   insightChips.push(isFr ? "Le plus budget-friendly" : "Most budget-friendly");
  //   callouts.push({
  //     label: isFr ? "Meilleur choix budget" : "Best budget pick",
  //     venueSlug: cheapest.slug,
  //     venueName: cheapest.name,
  //   });
  //   addStandout(standoutByVenue, cheapest.slug, isFr ? "Meilleur budget" : "Best budget");
  // }

  const mostSocial = getUniqueWinner(
    venues.map((venue) => ({ venue, value: socialScore(venue.socialLevel) })),
    "max"
  );
  if (mostSocial && socialScore(mostSocial.socialLevel) > 0) {
    insightChips.push(isFr ? "Option la plus sociale" : "Most social option");
    callouts.push({
      label: isFr ? "Idéal pour les plans sociaux" : "Best for social plans",
      venueSlug: mostSocial.slug,
      venueName: mostSocial.name,
    });
    addStandout(standoutByVenue, mostSocial.slug, isFr ? "Le plus social" : "Most social");
  }

  const calmest = getUniqueWinner(
    venues.map((venue) => ({
      venue,
      value: socialScore(venue.socialLevel) + energyScore(venue.energyLevel),
    })),
    "min"
  );
  if (calmest) {
    insightChips.push(isFr ? "Option la plus calme" : "Calmest option");
    callouts.push({
      label: isFr ? "Meilleur choix calme" : "Best calm pick",
      venueSlug: calmest.slug,
      venueName: calmest.name,
    });
    addStandout(standoutByVenue, calmest.slug, isFr ? "Le plus calme" : "Calmest");
  }

  const dateWinner = pickSingleCandidate(venues, isDateFriendly);
  if (dateWinner) {
    insightChips.push(isFr ? "Idéal en duo" : "Best for dates");
    callouts.push({
      label: isFr ? "Correspondance soirée en duo" : "Date night match",
      venueSlug: dateWinner.slug,
      venueName: dateWinner.name,
    });
    addStandout(standoutByVenue, dateWinner.slug, isFr ? "Idéal en duo" : "Date-friendly");
  }

  const friendsWinner = pickSingleCandidate(venues, isFriendsFriendly);
  if (friendsWinner) {
    insightChips.push(isFr ? "Idéal entre amis" : "Best for friends");
    callouts.push({
      label: isFr ? "Correspondance sortie entre amis" : "Friends hangout match",
      venueSlug: friendsWinner.slug,
      venueName: friendsWinner.name,
    });
    addStandout(standoutByVenue, friendsWinner.slug, isFr ? "Adapté amis" : "Friends fit");
  }

  const eveningWinner = pickSingleCandidate(venues, isEveningFriendly);
  if (eveningWinner) {
    insightChips.push(isFr ? "Meilleur choix du soir" : "Strongest evening pick");
    addStandout(standoutByVenue, eveningWinner.slug, isFr ? "Prêt pour le soir" : "Evening-ready");
  }

  const workWinner = pickSingleCandidate(venues, isWorkFriendly);
  if (workWinner) {
    insightChips.push(isFr ? "Meilleure option travail" : "Best work-friendly option");
    callouts.push({
      label: isFr ? "Choix focus/travail" : "Focus/work pick",
      venueSlug: workWinner.slug,
      venueName: workWinner.name,
    });
    addStandout(standoutByVenue, workWinner.slug, isFr ? "Adapté au travail" : "Work-friendly");
  }

  return {
    summary,
    insightChips: [...new Set(insightChips)].slice(0, 6),
    callouts: callouts.slice(0, 4),
    standoutByVenue,
  };
}

export function buildCompareWhyChips(venue: Venue): string[] {
  const bestFor = getBestForBadges(venue, 3);
  if (bestFor.length > 0) {
    return bestFor;
  }

  return [];
}
