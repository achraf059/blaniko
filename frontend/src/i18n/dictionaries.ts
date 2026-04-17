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
    searchPlaceholder: string;
    searchAction: string;
    quickFiltersLabel: string;
    budgetLabel: string;
    budgetAll: string;
    budgetLow: string;
    budgetMid: string;
    budgetHigh: string;
    recommendationsCta: string;
    helperText: string;
    panelEyebrow: string;
    panelStatOneLabel: string;
    panelStatOneValue: string;
    panelStatTwoLabel: string;
    panelStatTwoValue: string;
    panelStatThreeLabel: string;
    panelStatThreeValue: string;
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
  searchPage: {
    eyebrow: string;
    titleDefault: string;
    titleForQuery: string;
    subtitle: string;
    quickFiltersLabel: string;
    budgetLabel: string;
    budgetAll: string;
    budgetLow: string;
    budgetMid: string;
    budgetHigh: string;
    summaryQuery: string;
    summaryCategory: string;
    summaryBudget: string;
    clearFilters: string;
    emptyTitle: string;
    emptyDescription: string;
    resultsLabel: string;
    searchPlaceholder: string;
    searchAction: string;
  };
  recommendationsPage: {
    eyebrow: string;
    title: string;
    subtitle: string;
    query: string;
    category: string;
    budget: string;
    backHome: string;
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
    searchPlaceholder: "Search places, categories, or areas",
    searchAction: "Search",
    quickFiltersLabel: "Quick category filters",
    budgetLabel: "Budget",
    budgetAll: "All",
    budgetLow: "$",
    budgetMid: "$$",
    budgetHigh: "$$$",
    recommendationsCta: "Get personalized recommendations",
    helperText: "Try a mood, area, or category to start your city discovery flow.",
    panelEyebrow: "City pulse",
    panelStatOneLabel: "Trending now",
    panelStatOneValue: "Rooftop cafes · Sunset plans",
    panelStatTwoLabel: "Fast discovery",
    panelStatTwoValue: "Search + filters in one place",
    panelStatThreeLabel: "Neighborhood mix",
    panelStatThreeValue: "Maarif · Ain Diab · Gauthier",
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
  searchPage: {
    eyebrow: "Discovery results",
    titleDefault: "Explore matching venues",
    titleForQuery: 'Results for "{query}"',
    subtitle: "Refine your search with category and budget filters.",
    quickFiltersLabel: "Quick category filters",
    budgetLabel: "Budget",
    budgetAll: "All",
    budgetLow: "$",
    budgetMid: "$$",
    budgetHigh: "$$$",
    summaryQuery: "Query",
    summaryCategory: "Category",
    summaryBudget: "Budget",
    clearFilters: "Clear filters",
    emptyTitle: "No places found",
    emptyDescription:
      "Try another keyword, category, or budget to discover more venues.",
    resultsLabel: "results",
    searchPlaceholder: "Search places, categories, or areas",
    searchAction: "Search",
  },
  recommendationsPage: {
    eyebrow: "Personal recommendations",
    title: "Recommendation flow coming next",
    subtitle: "Your preferences are captured and this page is ready for the next phase.",
    query: "Query",
    category: "Category",
    budget: "Budget",
    backHome: "Back to homepage",
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
    searchPlaceholder: "Rechercher des lieux, catégories ou quartiers",
    searchAction: "Rechercher",
    quickFiltersLabel: "Filtres rapides",
    budgetLabel: "Budget",
    budgetAll: "Tous",
    budgetLow: "$",
    budgetMid: "$$",
    budgetHigh: "$$$",
    recommendationsCta: "Obtenir des recommandations personnalisées",
    helperText: "Essayez une ambiance, un quartier ou une catégorie pour commencer.",
    panelEyebrow: "Tendance locale",
    panelStatOneLabel: "En ce moment",
    panelStatOneValue: "Rooftops · Sorties sunset",
    panelStatTwoLabel: "Découverte rapide",
    panelStatTwoValue: "Recherche + filtres au même endroit",
    panelStatThreeLabel: "Quartiers clés",
    panelStatThreeValue: "Maarif · Ain Diab · Gauthier",
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
  searchPage: {
    eyebrow: "Résultats découverte",
    titleDefault: "Explorer les lieux correspondants",
    titleForQuery: 'Résultats pour "{query}"',
    subtitle: "Affinez avec les filtres catégorie et budget.",
    quickFiltersLabel: "Filtres rapides",
    budgetLabel: "Budget",
    budgetAll: "Tous",
    budgetLow: "$",
    budgetMid: "$$",
    budgetHigh: "$$$",
    summaryQuery: "Recherche",
    summaryCategory: "Catégorie",
    summaryBudget: "Budget",
    clearFilters: "Effacer les filtres",
    emptyTitle: "Aucun lieu trouvé",
    emptyDescription:
      "Essayez un autre mot-clé, une catégorie ou un budget pour découvrir plus d'adresses.",
    resultsLabel: "résultats",
    searchPlaceholder: "Rechercher des lieux, catégories ou quartiers",
    searchAction: "Rechercher",
  },
  recommendationsPage: {
    eyebrow: "Recommandations personnalisées",
    title: "Flux de recommandations bientôt disponible",
    subtitle:
      "Vos préférences sont bien capturées et cette page est prête pour la prochaine phase.",
    query: "Recherche",
    category: "Catégorie",
    budget: "Budget",
    backHome: "Retour à l'accueil",
  },
};

const dictionaries: Record<AppLanguage, Dictionary> = {
  en,
  fr,
};

export function getDictionary(language: AppLanguage): Dictionary {
  return dictionaries[language];
}
