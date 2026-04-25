import { type Venue } from "./mockData";
import type { AppLanguage } from "../i18n/types";

type AreaTranslation = {
  personality: string;
  bestFor: string;
  vibeSummary: string;
  intro: string;
  curatedHint: string;
};

export type AreaProfile = {
  slug: string;
  name: string;
  personality: string;
  bestFor: string;
  vibeSummary: string;
  intro: string;
  curatedHint: string;
  translations?: Partial<Record<Exclude<AppLanguage, "en">, AreaTranslation>>;
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
    translations: {
      fr: {
        personality: "Animé, social, moderne et décontracté",
        bestFor: "Retrouvailles entre amis, énergie après le travail, sorties faciles",
        vibeSummary: "Rythme urbain moderne avec des lieux sociaux proches les uns des autres.",
        intro:
          "Maarif, c'est Casablanca dans son rythme le plus rapide, social et pratique. Idéal quand vous voulez de la variété dans un même quartier sans trop planifier.",
        curatedHint:
          "Commencez par un café, enchaînez avec une pause sociale, puis terminez à proximité pour une belle soirée en ville.",
      },
    },
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
    translations: {
      fr: {
        personality: "Côtier, en plein air, propice aux couchers de soleil",
        bestFor: "Plans bord de mer, après-midis actifs, moments sunset",
        vibeSummary: "Littoral accueillant les activités en plein air, les vues et l'espace pour respirer.",
        intro:
          "Ain Diab, c'est Casablanca en mode côtier : vues ouvertes, parcours actifs et rythme relaxé au coucher du soleil.",
        curatedHint:
          "À utiliser en fin d'après-midi : commencez à vélo ou à pied, puis glissez vers une soirée plus posée.",
      },
    },
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
    translations: {
      fr: {
        personality: "Soigné, central, riche en cafés",
        bestFor: "Réunions café, sessions concentrées, accès au centre-ville",
        vibeSummary: "Un espace central pour les cafés de qualité et les plans sociaux compacts.",
        intro:
          "Gauthier mêle des rues citadines soignées à des lieux pratiques pour le café, les pauses travail et les soirées entre amis.",
        curatedHint:
          "Idéal pour des plans courte distance où chaque arrêt est accessible à pied et efficace dans le temps.",
      },
    },
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
    translations: {
      fr: {
        personality: "Local, culturel, animé",
        bestFor: "Balades gastronomiques, découverte locale, texture culturelle",
        vibeSummary: "Ruelles historiques avec une saveur locale et une énergie intense.",
        intro:
          "La Médina ancienne offre le pouls local de Casablanca : itinéraires traditionnels, ruelles animées et découverte par la gastronomie et la culture de rue.",
        curatedHint:
          "Venez avec de la curiosité, gardez votre plan souple et laissez de la place pour des découvertes spontanées.",
      },
    },
  },
];

export function getAreaBySlug(slug?: string): AreaProfile | undefined {
  if (!slug) {
    return undefined;
  }

  return areaProfiles.find((area) => area.slug === slug);
}

export function getAreaDisplay(
  area: AreaProfile,
  language: AppLanguage,
): Omit<AreaProfile, "translations"> {
  if (language !== "en" && area.translations?.[language]) {
    const t = area.translations[language]!;
    return { ...area, ...t };
  }
  return area;
}

function normalizeArea(value: string): string {
  return value.toLowerCase().replace(", casablanca", "").trim();
}

export function venueMatchesArea(venue: Venue, areaSlug: string): boolean {
  const normalizedVenueArea = normalizeArea(venue.area);
  const normalizedSlug = areaSlug.toLowerCase().trim();
  return normalizedVenueArea.includes(normalizedSlug);
}
