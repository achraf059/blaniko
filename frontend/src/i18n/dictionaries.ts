import type { AppLanguage } from "./types";

export type Dictionary = {
  header: {
    home: string;
    categories: string;
    venues: string;
    about: string;
    exploreNow: string;
    languageEn: string;
    languageFr: string;
  };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    discoverVenues: string;
    browseCategories: string;
    popularAreas: string;
  };
  home: {
    categoriesEyebrow: string;
    categoriesTitle: string;
    categoriesSubtitle: string;
    categoriesAction: string;
    featuredEyebrow: string;
    featuredTitle: string;
    featuredSubtitle: string;
    footerText: string;
  };
  categoryDescriptions: Record<string, string>;
  categoryPage: {
    backHome: string;
    eyebrow: string;
    notFoundTitle: string;
    notFoundDescription: string;
    results: string;
    result: string;
  };
  venueCard: {
    featured: string;
    viewDetails: string;
  };
  venuePage: {
    backToHome: string;
    backToCategory: string;
    panelEyebrow: string;
    panelSubtitle: string;
    notFoundTitle: string;
    notFoundDescription: string;
    overview: string;
    area: string;
    vibe: string;
    audience: string;
    priceLevel: string;
    fallbackOverview: string;
    fallbackVibe: string;
    fallbackAudience: string;
    fallbackPriceLevel: string;
  };
};

const en: Dictionary = {
  header: {
    home: "Home",
    categories: "Categories",
    venues: "Venues",
    about: "About Us",
    exploreNow: "Explore now",
    languageEn: "EN",
    languageFr: "FR",
  },
  hero: {
    badge: "Casablanca Discovery Platform",
    title: "Discover the best things to do in Casablanca.",
    subtitle:
      "Find cafes, restaurants, sports spots, and unique city experiences in one simple place. Blaniko helps you explore Casablanca like a local.",
    discoverVenues: "Discover venues",
    browseCategories: "Browse categories",
    popularAreas: "Popular areas: Maarif, Ain Diab, Gauthier, Old Medina",
  },
  home: {
    categoriesEyebrow: "Browse by mood",
    categoriesTitle: "Explore categories",
    categoriesSubtitle: "Start with a vibe, then discover places across Casablanca.",
    categoriesAction: "Explore category",
    featuredEyebrow: "Curated places",
    featuredTitle: "Featured venues",
    featuredSubtitle: "Handpicked spots to start exploring Casablanca.",
    footerText: "Discover what to do in Casablanca.",
  },
  categoryDescriptions: {
    cafes: "Coffee spots and chill city corners across Casablanca.",
    restaurants: "Local favorites and modern dining places in the city.",
    activities: "Experiences to break your routine and explore Casablanca.",
    sports: "Padel, fitness, and active vibes around town.",
    gaming: "Arcades, lounges, and social gaming spots.",
    outdoor: "Fresh-air plans around Casablanca neighborhoods.",
    family: "Kid-friendly venues and family activities.",
    couples: "Date ideas and cozy places for two.",
    friends: "Group plans and weekend hangout places.",
  },
  categoryPage: {
    backHome: "Back to homepage",
    eyebrow: "Casablanca category",
    notFoundTitle: "Category not found",
    notFoundDescription:
      "Sorry, we could not find this category yet. Try another one from the homepage.",
    results: "results",
    result: "result",
  },
  venueCard: {
    featured: "Featured",
    viewDetails: "View details",
  },
  venuePage: {
    backToHome: "Back to homepage",
    backToCategory: "Back to category",
    panelEyebrow: "Casablanca pick",
    panelSubtitle: "Curated place profile",
    notFoundTitle: "Venue not found",
    notFoundDescription:
      "Sorry, we could not find this venue yet. Please go back and try a different one.",
    overview: "Overview",
    area: "Area",
    vibe: "Vibe",
    audience: "Audience",
    priceLevel: "Price level",
    fallbackOverview:
      "{name} is a promising {category} option in {area}. This mock overview helps the MVP stay complete while we continue enriching venue details from real field research in Casablanca.",
    fallbackVibe: "Casual",
    fallbackAudience: "General",
    fallbackPriceLevel: "$$",
  },
};

const fr: Dictionary = {
  header: {
    home: "Accueil",
    categories: "Catégories",
    venues: "Lieux",
    about: "À propos",
    exploreNow: "Explorer",
    languageEn: "EN",
    languageFr: "FR",
  },
  hero: {
    badge: "Plateforme de découverte à Casablanca",
    title: "Découvrez les meilleures choses à faire à Casablanca.",
    subtitle:
      "Trouvez des cafés, restaurants, activités sportives et expériences locales au même endroit. Blaniko vous aide à explorer Casablanca comme un habitant.",
    discoverVenues: "Découvrir les lieux",
    browseCategories: "Parcourir les catégories",
    popularAreas: "Quartiers populaires : Maarif, Ain Diab, Gauthier, Ancienne Médina",
  },
  home: {
    categoriesEyebrow: "Explorer par ambiance",
    categoriesTitle: "Explorer les catégories",
    categoriesSubtitle:
      "Commencez par une ambiance, puis découvrez des adresses à Casablanca.",
    categoriesAction: "Explorer la catégorie",
    featuredEyebrow: "Adresses sélectionnées",
    featuredTitle: "Lieux en vedette",
    featuredSubtitle:
      "Une sélection d'adresses pour commencer à explorer Casablanca.",
    footerText: "Découvrez quoi faire à Casablanca.",
  },
  categoryDescriptions: {
    cafes: "Des cafés et coins détente partout à Casablanca.",
    restaurants: "Des adresses locales et des restaurants modernes en ville.",
    activities: "Des expériences pour changer de routine et explorer Casablanca.",
    sports: "Padel, fitness et activités dynamiques en ville.",
    gaming: "Arcades, lounges et espaces gaming conviviaux.",
    outdoor: "Des idées de sorties en plein air dans Casablanca.",
    family: "Des lieux et activités adaptés aux familles.",
    couples: "Des idées de sorties et endroits chaleureux pour deux.",
    friends: "Des plans de groupe et sorties du week-end.",
  },
  categoryPage: {
    backHome: "Retour à l'accueil",
    eyebrow: "Catégorie à Casablanca",
    notFoundTitle: "Catégorie introuvable",
    notFoundDescription:
      "Désolé, cette catégorie n'est pas encore disponible. Essayez une autre catégorie depuis l'accueil.",
    results: "résultats",
    result: "résultat",
  },
  venueCard: {
    featured: "À la une",
    viewDetails: "Voir les détails",
  },
  venuePage: {
    backToHome: "Retour à l'accueil",
    backToCategory: "Retour à la catégorie",
    panelEyebrow: "Sélection Casablanca",
    panelSubtitle: "Profil du lieu",
    notFoundTitle: "Lieu introuvable",
    notFoundDescription:
      "Désolé, ce lieu n'est pas encore disponible. Revenez en arrière et essayez-en un autre.",
    overview: "Aperçu",
    area: "Quartier",
    vibe: "Ambiance",
    audience: "Public",
    priceLevel: "Niveau de prix",
    fallbackOverview:
      "{name} est une adresse intéressante dans la catégorie {category}, située à {area}. Cette description est provisoire pour garder le MVP complet pendant l'enrichissement des données terrain à Casablanca.",
    fallbackVibe: "Décontracté",
    fallbackAudience: "Tout public",
    fallbackPriceLevel: "$$",
  },
};

const dictionaries: Record<AppLanguage, Dictionary> = {
  en,
  fr,
};

export function getDictionary(language: AppLanguage): Dictionary {
  return dictionaries[language];
}
