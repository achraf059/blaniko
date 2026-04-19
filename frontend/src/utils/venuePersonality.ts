import { type Venue } from "../data/mockData";

type VenuePersonalityInput = Pick<
  Venue,
  | "description"
  | "shortDescription"
  | "vibe"
  | "vibeSummary"
  | "audience"
  | "priceLevel"
  | "bestForTags"
  | "timeOfDay"
  | "energyLevel"
  | "socialLevel"
  | "spaceType"
>;

const bestForLabelMap: Record<string, string> = {
  "date-spot": "Date spot",
  friends: "Friends",
  "solo-coffee": "Solo coffee",
  "work-friendly": "Work-friendly",
  "family-friendly": "Family-friendly",
  "budget-pick": "Budget pick",
  "sunset-spot": "Sunset spot",
  "late-night": "Late-night",
};

const timeLabelMap: Record<string, string> = {
  morning: "Best in the morning",
  afternoon: "Great for afternoons",
  evening: "Best in the evening",
  "late-night": "Works late-night",
};

const energyLabelMap: Record<string, string> = {
  low: "Low energy",
  medium: "Medium energy",
  high: "High energy",
};

const socialLabelMap: Record<string, string> = {
  low: "Calm",
  medium: "Balanced",
  high: "Social",
};

const spaceLabelMap: Record<string, string> = {
  indoor: "Indoor",
  outdoor: "Outdoor",
  mixed: "Indoor / Outdoor",
};

export function getBestForBadges(venue: VenuePersonalityInput, max = 3): string[] {
  const fromMetadata = (venue.bestForTags ?? [])
    .map((tag) => bestForLabelMap[tag] ?? tag)
    .slice(0, max);

  if (fromMetadata.length > 0) {
    return fromMetadata;
  }

  const fallback: string[] = [];
  const audienceText = `${venue.audience ?? ""} ${venue.description}`.toLowerCase();

  if (audienceText.includes("couples") || audienceText.includes("date")) {
    fallback.push("Date spot");
  }
  if (audienceText.includes("friends") || audienceText.includes("groups")) {
    fallback.push("Friends");
  }
  if (audienceText.includes("family") || audienceText.includes("children")) {
    fallback.push("Family-friendly");
  }
  if (audienceText.includes("remote") || audienceText.includes("freelancer")) {
    fallback.push("Work-friendly");
  }
  if ((venue.priceLevel ?? "") === "$") {
    fallback.push("Budget pick");
  }

  return fallback.slice(0, max);
}

export function getVenuePersonalitySignals(venue: VenuePersonalityInput): string[] {
  const signals: string[] = [];

  const firstTime = venue.timeOfDay?.[0];
  if (firstTime) {
    signals.push(timeLabelMap[firstTime] ?? firstTime);
  }

  if (venue.socialLevel) {
    signals.push(socialLabelMap[venue.socialLevel] ?? venue.socialLevel);
  }

  if (venue.energyLevel) {
    signals.push(energyLabelMap[venue.energyLevel] ?? venue.energyLevel);
  }

  if (venue.spaceType) {
    signals.push(spaceLabelMap[venue.spaceType] ?? venue.spaceType);
  }

  return signals;
}

export function getVenuePersonalitySection(venue: VenuePersonalityInput) {
  return {
    whyPeopleChoose:
      venue.vibeSummary ?? venue.shortDescription ?? venue.description,
    bestFor: getBestForBadges(venue, 4),
    bestTimeToGo: (venue.timeOfDay ?? []).map((slot) => timeLabelMap[slot] ?? slot),
    atmosphere: [
      venue.vibe ?? "",
      venue.socialLevel ? socialLabelMap[venue.socialLevel] : "",
      venue.energyLevel ? energyLabelMap[venue.energyLevel] : "",
      venue.spaceType ? spaceLabelMap[venue.spaceType] : "",
    ]
      .filter(Boolean)
      .join(" • "),
  };
}
