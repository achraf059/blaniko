import type { AppLanguage } from "./types";

export type Dictionary = {
  header: {
    home: string;
    categories: string;
    venues: string;
    favorites: string;
    map: string;
    admin: string;
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
  claudeHome: {
    navExplore: string;
    navCategories: string;
    navCurated: string;
    navMap: string;
    saved: string;
    joinList: string;
    arComingSoon: string;
    heroEyebrowCity: string;
    heroHeadlinePrefix: string;
    heroHeadlineEmphasis: string;
    heroHeadlineSuffix: string;
    heroSubtitle: string;
    heroSearchPlaceholder: string;
    heroExplore: string;
    heroTagWeekend: string;
    heroTagOutdoor: string;
    heroTagUnder200: string;
    heroTagDateNight: string;
    heroTagWithKids: string;
    heroTagTonight: string;
    continuationEyebrow: string;
    continuationTitlePrefix: string;
    continuationTitleEmphasis: string;
    continuationTitleSuffix: string;
    continuationRight: string;
    continuationCardLabel: string;
    continuationCardTitle: string;
    continuationCardDescription: string;
    continuationCta: string;
    categoriesEyebrow: string;
    categoriesTitlePrefix: string;
    categoriesTitleEmphasis: string;
    categoriesRight: string;
    curatedEyebrow: string;
    curatedTitlePrefix: string;
    curatedTitleEmphasis: string;
    curatedTitleSuffix: string;
    curatedRight: string;
    mapEyebrow: string;
    mapTitlePrefix: string;
    mapTitleEmphasis: string;
    mapTitleSuffix: string;
    mapActivities: string;
    mapNeighborhoods: string;
    mapOpen: string;
    howEyebrow: string;
    howTitlePrefix: string;
    howTitleEmphasis: string;
    howTitleSuffix: string;
    moodsHead: string;
    footerCtaTitlePrefix: string;
    footerCtaTitleEmphasis: string;
    footerEmailPlaceholder: string;
    footerSmallNote: string;
    editorialEyebrow: string;
    editorialTitlePrefix: string;
    editorialTitleEmphasis: string;
    editorialTitleSuffix: string;
    editorialDescription: string;
    editorialRead: string;
    compareLabel: string;
    compareSelected: string;
    compareClear: string;
    compareGo: string;
  };
  categoryNames: Record<string, string>;
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
    saveFavorite: string;
    removeFavorite: string;
    whyThisPlace: string;
  };
  venuePage: {
    backToHome: string;
    backToCategory: string;
    backToFavorites: string;
    backToMap: string;
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
    saveFavorite: string;
    removeFavorite: string;
    unknownCategory: string;
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
  favoritesPage: {
    eyebrow: string;
    title: string;
    subtitle: string;
    savedLabel: string;
    clearAll: string;
    emptyTitle: string;
    emptyDescription: string;
    browseHome: string;
  };
  mapPage: {
    eyebrow: string;
    title: string;
    subtitle: string;
    helperText: string;
    quickFiltersLabel: string;
    budgetLabel: string;
    budgetAll: string;
    budgetLow: string;
    budgetMid: string;
    budgetHigh: string;
    searchPlaceholder: string;
    searchAction: string;
    listTitle: string;
    mapTitle: string;
    emptyTitle: string;
    emptyDescription: string;
    showOnMap: string;
    selectedLabel: string;
    viewDetails: string;
  };
  adminPage: {
    eyebrow: string;
    title: string;
    subtitle: string;
    helper: string;
    listTitle: string;
    createAction: string;
    editAction: string;
    resetAction: string;
    searchPlaceholder: string;
    categoryAll: string;
    coordsReady: string;
    coordsMissing: string;
    formCreateTitle: string;
    formEditTitle: string;
    fieldName: string;
    fieldCategory: string;
    fieldArea: string;
    fieldBudget: string;
    fieldShortDescription: string;
    fieldOverview: string;
    fieldVibe: string;
    fieldAudience: string;
    fieldLatitude: string;
    fieldLongitude: string;
    saveAction: string;
    cancelAction: string;
    deleteAction: string;
    deleteConfirm: string;
    savedFeedback: string;
    deletedFeedback: string;
    errNameRequired: string;
    errCategoryRequired: string;
    errAreaRequired: string;
    errBudgetFormat: string;
    errShortDescriptionRequired: string;
    errCoordsBothRequired: string;
    errLatitudeRange: string;
    errLongitudeRange: string;
  };
};

const en: Dictionary = {
  header: {
    home: "Home",
    categories: "Categories",
    venues: "Venues",
    favorites: "Favorites",
    map: "Map",
    admin: "Admin",
    about: "About Us",
    exploreNow: "Explore now",
    languageEn: "EN",
    languageFr: "FR",
  },
  hero: {
    badge: "Casablanca Discovery Platform",
    title: "Discover Casablanca",
    subtitle:
      "Find activities, hangouts, sports spots, and unique city experiences in one simple place. Blaniko helps you explore Casablanca like a local.",
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
  claudeHome: {
    navExplore: "Explore",
    navCategories: "Categories",
    navCurated: "Picks",
    navMap: "Map",
    saved: "Saved",
    joinList: "Join the list",
    arComingSoon: "Arabic coming soon",
    heroEyebrowCity: "Casablanca · MA",
    heroHeadlinePrefix: "Discover the",
    heroHeadlineEmphasis: "quietly extraordinary",
    heroHeadlineSuffix: "in Casablanca.",
    heroSubtitle:
      "A curated guide to the activities, workshops, and weekend plans that make the city feel like yours — chosen with taste, updated every week.",
    heroSearchPlaceholder: "Surf, pottery, rooftop dinner…",
    heroExplore: "Explore",
    heroTagWeekend: "This weekend",
    heroTagOutdoor: "Outdoor",
    heroTagUnder200: "Under MAD 200",
    heroTagDateNight: "Date night",
    heroTagWithKids: "With kids",
    heroTagTonight: "Tonight",
    continuationEyebrow: "02 — Continuation",
    continuationTitlePrefix: "A closer",
    continuationTitleEmphasis: "look",
    continuationTitleSuffix: "hand-picked from this week in the city.",
    continuationRight:
      "Weekly edits, drawn from the people, places, and small rituals that make a Saturday in Casablanca worth planning.",
    continuationCardLabel: "This week's edit",
    continuationCardTitle:
      "Four ways to spend the weekend — each chosen for a different mood.",
    continuationCardDescription:
      "Morning swell. Afternoon clay. Evening reel. Late film. Move between them at your own pace, or take one at a time.",
    continuationCta: "See the full edit",
    categoriesEyebrow: "03 — Browse",
    categoriesTitlePrefix: "Every mood",
    categoriesTitleEmphasis: "has a category",
    categoriesRight:
      "Nine ways into the city. Pick an entry point — or drift between them.",
    curatedEyebrow: "04 — Curated",
    curatedTitlePrefix: "The week's",
    curatedTitleEmphasis: "picks",
    curatedTitleSuffix: "chosen with care.",
    curatedRight:
      "Editor-curated activities, updated every Monday. No pay-to-play.",
    mapEyebrow: "06 — Map",
    mapTitlePrefix: "See the city",
    mapTitleEmphasis: "as a map",
    mapTitleSuffix: "not a list.",
    mapActivities: "220 activities",
    mapNeighborhoods: "12 neighborhoods",
    mapOpen: "Open map",
    howEyebrow: "05 — How it works",
    howTitlePrefix: "A simple",
    howTitleEmphasis: "rhythm",
    howTitleSuffix: "discover, choose, go.",
    moodsHead: "Find by mood",
    footerCtaTitlePrefix: "Find your",
    footerCtaTitleEmphasis: "weekend",
    footerEmailPlaceholder: "your@email.com",
    footerSmallNote: "One email a week · unsubscribe any time",
    editorialEyebrow: "Weekly edit · Issue 14",
    editorialTitlePrefix: "A quiet guide to",
    editorialTitleEmphasis: "autumn",
    editorialTitleSuffix: "in Casablanca.",
    editorialDescription:
      "Six spaces to slow down in, from a rooftop library above Maarif to a glassblower's studio in Bouskoura. Writing and photographs by our editors.",
    editorialRead: "Read the edit",
    compareLabel: "Compare",
    compareSelected: "{count} activities selected",
    compareClear: "Clear",
    compareGo: "Compare",
  },
  categoryNames: {
    cafes: "Cafes & Hangouts",
    restaurants: "Food Experiences",
    activities: "Activities",
    sports: "Sports",
    gaming: "Gaming",
    outdoor: "Outdoor",
    family: "Family",
    couples: "Couples",
    friends: "Friends",
  },
  categoryDescriptions: {
    cafes: "Atmospheric cafés, social spots, and work-friendly hangouts.",
    restaurants: "Food-led experiences, date-night spots, and memorable dining plans.",
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
    saveFavorite: "Save",
    removeFavorite: "Saved",
    whyThisPlace: "Why this place?",
  },
  venuePage: {
    backToHome: "Back to homepage",
    backToCategory: "Back to category",
    backToFavorites: "Back to favorites",
    backToMap: "Back to map",
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
    saveFavorite: "Save to favorites",
    removeFavorite: "Remove from favorites",
    unknownCategory: "Venue",
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
  favoritesPage: {
    eyebrow: "Saved places",
    title: "Your favorite venues",
    subtitle: "Keep your preferred Casablanca spots in one place.",
    savedLabel: "saved",
    clearAll: "Clear all",
    emptyTitle: "No favorites yet",
    emptyDescription: "Save places from homepage, search, or recommendations.",
    browseHome: "Browse venues",
  },
  mapPage: {
    eyebrow: "Geographic discovery",
    title: "Explore venues on the map",
    subtitle: "Browse Casablanca places by area and switch quickly between map and list.",
    helperText: "Tip: click any marker to preview details and open the venue page.",
    quickFiltersLabel: "Quick category filters",
    budgetLabel: "Budget",
    budgetAll: "All",
    budgetLow: "$",
    budgetMid: "$$",
    budgetHigh: "$$$",
    searchPlaceholder: "Search places, categories, or areas",
    searchAction: "Search",
    listTitle: "Venues",
    mapTitle: "Casablanca map",
    emptyTitle: "No map matches",
    emptyDescription: "Try another keyword, category, or budget.",
    showOnMap: "Show on map",
    selectedLabel: "Selected",
    viewDetails: "View details",
  },
  adminPage: {
    eyebrow: "Venue management",
    title: "Admin venue dashboard",
    subtitle: "Create and edit local venue data for the MVP.",
    helper:
      "Changes are stored locally in your browser for now. This structure is ready for backend migration later.",
    listTitle: "Venue list",
    createAction: "Create new venue",
    editAction: "Edit",
    resetAction: "Reset to mock defaults",
    searchPlaceholder: "Search venues by name, category, or area",
    categoryAll: "All categories",
    coordsReady: "Map coordinates ready",
    coordsMissing: "Coordinates missing",
    formCreateTitle: "Create venue",
    formEditTitle: "Edit venue",
    fieldName: "Name",
    fieldCategory: "Category",
    fieldArea: "Area",
    fieldBudget: "Budget",
    fieldShortDescription: "Short description",
    fieldOverview: "Overview",
    fieldVibe: "Vibe",
    fieldAudience: "Audience",
    fieldLatitude: "Latitude",
    fieldLongitude: "Longitude",
    saveAction: "Save venue",
    cancelAction: "Cancel",
    deleteAction: "Delete venue",
    deleteConfirm: "Delete this venue from local admin data?",
    savedFeedback: "Venue saved locally.",
    deletedFeedback: "Venue deleted locally.",
    errNameRequired: "Name is required.",
    errCategoryRequired: "Category is required.",
    errAreaRequired: "Area is required.",
    errBudgetFormat: "Budget must be $, $$ or $$$.",
    errShortDescriptionRequired: "Short description is required.",
    errCoordsBothRequired: "Both latitude and longitude are required together.",
    errLatitudeRange: "Latitude must be between -90 and 90.",
    errLongitudeRange: "Longitude must be between -180 and 180.",
  },
};

const fr: Dictionary = {
  header: {
    home: "Accueil",
    categories: "Catégories",
    venues: "Lieux",
    favorites: "Favoris",
    map: "Carte",
    admin: "Admin",
    about: "À propos",
    exploreNow: "Explorer",
    languageEn: "EN",
    languageFr: "FR",
  },
  hero: {
    badge: "Plateforme de découverte à Casablanca",
    title: "Découvrez Casablanca",
    subtitle:
      "Trouvez des activités, hangouts, spots sportifs et expériences locales au même endroit. Blaniko vous aide à explorer Casablanca comme un habitant.",
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
  claudeHome: {
    navExplore: "Explorer",
    navCategories: "Catégories",
    navCurated: "Sélection",
    navMap: "Carte",
    saved: "Enregistrés",
    joinList: "Rejoindre la liste",
    arComingSoon: "Arabe bientôt disponible",
    heroEyebrowCity: "Casablanca · MA",
    heroHeadlinePrefix: "Découvrez le",
    heroHeadlineEmphasis: "discrètement extraordinaire",
    heroHeadlineSuffix: "à Casablanca.",
    heroSubtitle:
      "Un guide sélectionné d'activités, d'ateliers et de plans de week-end qui rendent la ville plus personnelle — choisi avec goût, mis à jour chaque semaine.",
    heroSearchPlaceholder: "Surf, poterie, dîner rooftop…",
    heroExplore: "Explorer",
    heroTagWeekend: "Ce week-end",
    heroTagOutdoor: "En plein air",
    heroTagUnder200: "Moins de 200 MAD",
    heroTagDateNight: "Soirée en duo",
    heroTagWithKids: "Avec enfants",
    heroTagTonight: "Ce soir",
    continuationEyebrow: "02 — Continuation",
    continuationTitlePrefix: "Un regard",
    continuationTitleEmphasis: "plus proche",
    continuationTitleSuffix: "sélectionné dans l'édition de cette semaine.",
    continuationRight:
      "Des sélections hebdomadaires inspirées des lieux, des gens et des petits rituels qui rendent un samedi à Casablanca digne d'être planifié.",
    continuationCardLabel: "Édition de la semaine",
    continuationCardTitle:
      "Quatre façons de vivre le week-end — chacune pensée pour une ambiance différente.",
    continuationCardDescription:
      "Vague du matin. Poterie l'après-midi. Séance du soir. Film tardif. Enchaînez-les à votre rythme, ou choisissez-en une seule.",
    continuationCta: "Voir l'édition complète",
    categoriesEyebrow: "03 — Explorer",
    categoriesTitlePrefix: "Chaque ambiance",
    categoriesTitleEmphasis: "a sa catégorie",
    categoriesRight:
      "Neuf portes d'entrée dans la ville. Choisissez un point de départ — ou passez de l'une à l'autre.",
    curatedEyebrow: "04 — Sélection",
    curatedTitlePrefix: "Les",
    curatedTitleEmphasis: "choix de la semaine",
    curatedTitleSuffix: "choisis avec soin.",
    curatedRight:
      "Des activités sélectionnées par l'équipe, mises à jour chaque lundi. Pas de mise en avant payante.",
    mapEyebrow: "06 — Carte",
    mapTitlePrefix: "Voyez la ville",
    mapTitleEmphasis: "comme une carte",
    mapTitleSuffix: "pas comme une liste.",
    mapActivities: "220 activités",
    mapNeighborhoods: "12 quartiers",
    mapOpen: "Ouvrir la carte",
    howEyebrow: "05 — Fonctionnement",
    howTitlePrefix: "Un",
    howTitleEmphasis: "rythme simple",
    howTitleSuffix: "découvrez, choisissez, partez.",
    moodsHead: "Explorer par ambiance",
    footerCtaTitlePrefix: "Trouvez votre",
    footerCtaTitleEmphasis: "week-end",
    footerEmailPlaceholder: "votre@email.com",
    footerSmallNote: "Un email par semaine · désinscription à tout moment",
    editorialEyebrow: "Édition hebdo · Numéro 14",
    editorialTitlePrefix: "Un guide paisible de",
    editorialTitleEmphasis: "l'automne",
    editorialTitleSuffix: "à Casablanca.",
    editorialDescription:
      "Six lieux pour ralentir, d'une bibliothèque rooftop au-dessus de Maarif à l'atelier d'un souffleur de verre à Bouskoura. Rédaction et photos par nos éditeurs.",
    editorialRead: "Lire l'édition",
    compareLabel: "Comparer",
    compareSelected: "{count} activités sélectionnées",
    compareClear: "Effacer",
    compareGo: "Comparer",
  },
  categoryNames: {
    cafes: "Cafés & Hangouts",
    restaurants: "Expériences food",
    activities: "Activités",
    sports: "Sports",
    gaming: "Gaming",
    outdoor: "Plein air",
    family: "Famille",
    couples: "Couples",
    friends: "Amis",
  },
  categoryDescriptions: {
    cafes: "Des cafés d’ambiance, spots sociaux et hangouts pour travailler ou sortir.",
    restaurants: "Des expériences autour de la food, des soirées en duo et des plans mémorables.",
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
    saveFavorite: "Enregistrer",
    removeFavorite: "Enregistré",
    whyThisPlace: "Pourquoi cet endroit ?",
  },
  venuePage: {
    backToHome: "Retour à l'accueil",
    backToCategory: "Retour à la catégorie",
    backToFavorites: "Retour aux favoris",
    backToMap: "Retour à la carte",
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
    saveFavorite: "Ajouter aux favoris",
    removeFavorite: "Retirer des favoris",
    unknownCategory: "Lieu",
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
  favoritesPage: {
    eyebrow: "Lieux enregistrés",
    title: "Vos lieux favoris",
    subtitle: "Gardez vos adresses préférées de Casablanca au même endroit.",
    savedLabel: "enregistrés",
    clearAll: "Tout effacer",
    emptyTitle: "Aucun favori pour le moment",
    emptyDescription:
      "Enregistrez des lieux depuis l'accueil, la recherche ou les recommandations.",
    browseHome: "Parcourir les lieux",
  },
  mapPage: {
    eyebrow: "Découverte géographique",
    title: "Explorez les lieux sur la carte",
    subtitle:
      "Parcourez les adresses de Casablanca par quartier et passez rapidement entre carte et liste.",
    helperText:
      "Astuce : cliquez sur un marqueur pour voir un aperçu et ouvrir la fiche du lieu.",
    quickFiltersLabel: "Filtres rapides",
    budgetLabel: "Budget",
    budgetAll: "Tous",
    budgetLow: "$",
    budgetMid: "$$",
    budgetHigh: "$$$",
    searchPlaceholder: "Rechercher des lieux, catégories ou quartiers",
    searchAction: "Rechercher",
    listTitle: "Lieux",
    mapTitle: "Carte de Casablanca",
    emptyTitle: "Aucun résultat sur la carte",
    emptyDescription: "Essayez un autre mot-clé, une catégorie ou un budget.",
    showOnMap: "Voir sur la carte",
    selectedLabel: "Sélectionné",
    viewDetails: "Voir les détails",
  },
  adminPage: {
    eyebrow: "Gestion des lieux",
    title: "Tableau de bord admin des lieux",
    subtitle: "Créez et modifiez les données locales des lieux pour le MVP.",
    helper:
      "Les changements sont stockés localement dans le navigateur pour l'instant. Cette structure est prête pour une migration backend plus tard.",
    listTitle: "Liste des lieux",
    createAction: "Créer un nouveau lieu",
    editAction: "Modifier",
    resetAction: "Réinitialiser les données mock",
    searchPlaceholder: "Rechercher par nom, catégorie ou quartier",
    categoryAll: "Toutes les catégories",
    coordsReady: "Coordonnées carte prêtes",
    coordsMissing: "Coordonnées manquantes",
    formCreateTitle: "Créer un lieu",
    formEditTitle: "Modifier un lieu",
    fieldName: "Nom",
    fieldCategory: "Catégorie",
    fieldArea: "Quartier",
    fieldBudget: "Budget",
    fieldShortDescription: "Description courte",
    fieldOverview: "Aperçu",
    fieldVibe: "Ambiance",
    fieldAudience: "Public",
    fieldLatitude: "Latitude",
    fieldLongitude: "Longitude",
    saveAction: "Enregistrer le lieu",
    cancelAction: "Annuler",
    deleteAction: "Supprimer le lieu",
    deleteConfirm: "Supprimer ce lieu des données admin locales ?",
    savedFeedback: "Lieu enregistré localement.",
    deletedFeedback: "Lieu supprimé localement.",
    errNameRequired: "Le nom est requis.",
    errCategoryRequired: "La catégorie est requise.",
    errAreaRequired: "Le quartier est requis.",
    errBudgetFormat: "Le budget doit être $, $$ ou $$$.",
    errShortDescriptionRequired: "La description courte est requise.",
    errCoordsBothRequired: "Latitude et longitude sont requises ensemble.",
    errLatitudeRange: "La latitude doit être entre -90 et 90.",
    errLongitudeRange: "La longitude doit être entre -180 et 180.",
  },
};

const dictionaries: Record<AppLanguage, Dictionary> = {
  en,
  fr,
};

export function getDictionary(language: AppLanguage): Dictionary {
  return dictionaries[language];
}
