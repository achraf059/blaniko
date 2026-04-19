import { type Venue } from "./mockData";

export type AreaProfile = {
  slug: string;
  name: string;
  personality: string;
  bestFor: string;
  vibeSummary: string;
  intro: string;
  curatedHint: string;
};

export const areaProfiles: AreaProfile[] = [
  {
    slug: "maarif",
    name: "Maarif",
    personality: "Lively, social, casual-modern",
    bestFor: "Friend meetups, after-work energy, easy nights out",
    vibeSummary: "Modern city rhythm with social venues close to each other.",
    intro:
      "Maarif is where Casablanca feels fast, social, and practical. It is ideal when you want variety in one area without overplanning.",
    curatedHint:
      "Start with a cafe, move to a social stop, then wrap up nearby for a smooth city evening.",
  },
  {
    slug: "ain-diab",
    name: "Ain Diab",
    personality: "Coastal, open-air, sunset-friendly",
    bestFor: "Sea breeze plans, active afternoons, sunset moments",
    vibeSummary: "Outdoor-friendly coastline with movement, views, and breathing room.",
    intro:
      "Ain Diab is Casablanca in coastal mode: open views, active routes, and a relaxed sunset pace.",
    curatedHint:
      "Best used in late afternoon: bike or walk first, then transition into a relaxed evening stop.",
  },
  {
    slug: "gauthier",
    name: "Gauthier",
    personality: "Polished, central, cafe-heavy",
    bestFor: "Coffee meetings, focused sessions, central city access",
    vibeSummary: "A central pocket for quality cafes and compact social plans.",
    intro:
      "Gauthier mixes polished city streets with practical venues for coffee, work blocks, and evening hangouts.",
    curatedHint:
      "Use it for short-distance plans where every stop is walkable and time-efficient.",
  },
  {
    slug: "old-medina",
    name: "Old Medina",
    personality: "Local, cultural, lively",
    bestFor: "Food walks, local discovery, cultural city texture",
    vibeSummary: "Historic streets with local flavor and high energy.",
    intro:
      "Old Medina offers Casablanca's local pulse: traditional routes, busy corners, and discovery through food and street culture.",
    curatedHint:
      "Come with curiosity, keep your plan flexible, and leave room for spontaneous local stops.",
  },
];

export function getAreaBySlug(slug?: string): AreaProfile | undefined {
  if (!slug) {
    return undefined;
  }

  return areaProfiles.find((area) => area.slug === slug);
}

function normalizeArea(value: string): string {
  return value.toLowerCase().replace(", casablanca", "").trim();
}

export function venueMatchesArea(venue: Venue, areaSlug: string): boolean {
  const normalizedVenueArea = normalizeArea(venue.area);
  const normalizedSlug = areaSlug.toLowerCase().trim();
  return normalizedVenueArea.includes(normalizedSlug);
}
