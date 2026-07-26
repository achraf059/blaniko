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
    navSearch: string;
    navGuides: string;
    navPlan: string;
    navForVenues: string;
    navContact: string;
    navMenuExploreBlaniko: string;
    navMenuCategories: string;
    navMenuMore: string;
    navMenuRecommendations: string;
    navMenuPrivacy: string;
    navAccount: string;
    navSignIn: string;
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
    heroStartPlanning: string;
    heroTagWeekend: string;
    heroTagOutdoor: string;
    heroTagUnder200: string;
    heroTagDateNight: string;
    heroTagWithKids: string;
    heroTagTonight: string;
    categoriesEyebrow: string;
    categoriesTitlePrefix: string;
    categoriesTitleEmphasis: string;
    categoriesRight: string;
    categoriesNotSurePrompt: string;
    categoriesNotSureCta: string;
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
    footerCtaTitlePrefix: string;
    footerCtaTitleEmphasis: string;
    footerCtaSubtitle: string;
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
    waitlistSuccess: string;
    waitlistError: string;
    waitlistJoining: string;
    waitlistDuplicate: string;
    waitlistInvalidEmail: string;
    aboutEyebrow: string;
    aboutTitlePrefix: string;
    aboutTitleEmphasis: string;
    aboutBody: string;
    footerPrivacyLink: string;
    footerForVenues: string;
    navThemeToLight: string;
    navThemeToDark: string;
    skipToMain: string;
  };
  categoryNames: Record<string, string>;
  categoryDescriptions: Record<string, string>;
  categoryPage: {
    backHome: string;
    eyebrow: string;
    allVenuesEyebrow: string;
    notFoundTitle: string;
    notFoundDescription: string;
    results: string;
    result: string;
    findingPlaces: string;
    toExplore: string;
    emptyFilterTitle: string;
    emptyComingSoonTitle: string;
    emptyComingSoonDescBefore: string;
    emptyComingSoonDescAfter: string;
    browseAll: string;
    couplesRedirectTitle: string;
    couplesRedirectDesc: string;
    couplesCta: string;
    friendsRedirectTitle: string;
    friendsRedirectDesc: string;
    friendsCta: string;
    // redesign strings
    sidebarEyebrow: string;
    sidebarTitle: string;
    searchVenues: string;
    sortBy: string;
    sortRecommended: string;
    sortAZ: string;
    filtersLabel: string;
    clearAll: string;
    locationLabel: string;
    locationAll: string;
    goodForLabel: string;
    goodForAll: string;
    timeLabel: string;
    timeAny: string;
    timeMorning: string;
    timeAfternoon: string;
    timeEvening: string;
    timeLateNight: string;
    subcatLabel: string;
    topPicksTitle: string;
    topPicksLink: string;
    featuredBadge: string;
    allVenuesTitle: string;
    moreVenuesTitle: string;
    showingCount: string;
    showingMoreCount: string;
    noVenuesTitle: string;
    noVenuesSub: string;
    clearFilters: string;
    exploreMore: string;
    planCtaTitle: string;
    planCtaSub: string;
    planCtaBtn: string;
    filtersBtn: string;
    gridView: string;
    listView: string;
    explore: string;
  };
  notFoundPage: {
    title: string;
    description: string;
    backToHome: string;
    browseVenues: string;
  };
  loginPage: {
    title: string;
    subtitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    submitBtn: string;
    submitting: string;
    successTitle: string;
    successDesc: string;
    backToHome: string;
    errorGeneric: string;
    notConfigured: string;
  };
  accountPage: {
    title: string;
    loggedInAs: string;
    logOutBtn: string;
    logOutting: string;
    guestTitle: string;
    guestDesc: string;
    loginBtn: string;
    backToHome: string;
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
    loading: string;
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
    actionOpenMaps: string;
    actionCall: string;
    actionWhatsApp: string;
    actionWebsite: string;
    actionInstagram: string;
    actionContactSoon: string;
    trustCollected: string;
    trustCollectedSub: string;
    trustConfirmed: string;
    trustVerified: string;
    trustLastUpdated: string;
  };
  searchPage: {
    pageTitle: string;
    pageDescription: string;
    eyebrow: string;
    titleDefault: string;
    titleForQuery: string;
    moodPicksTitle: string;
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
    resultsInCity: string;
    findingPlaces: string;
    searchPlaceholder: string;
    searchAction: string;
    curatedPlaces: string;
    handpickedUpdated: string;
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
    pageTitle: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    savedLabel: string;
    clearAll: string;
    clearConfirm: string;
    clearConfirmYes: string;
    clearConfirmCancel: string;
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
    loading: string;
    emptyTitle: string;
    emptyDescription: string;
    noCoordsTitle: string;
    noCoordsDescription: string;
    errorTitle: string;
    errorDescription: string;
    showOnMap: string;
    selectedLabel: string;
    viewDetails: string;
    venues: string;
    lessFilters: string;
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
  common: {
    apiError: string;
    retry: string;
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
    panelStatOneValue: "Padel · Escape rooms · Sunset plans",
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
    navExplore: "Home",
    navCategories: "Categories",
    navCurated: "Top picks",
    navMap: "Map",
    navSearch: "Explore",
    navGuides: "Guides",
    navPlan: "Plan",
    navForVenues: "For venues",
    navContact: "Contact",
    navMenuExploreBlaniko: "Explore Blaniko",
    navMenuCategories: "Categories",
    navMenuMore: "More",
    navMenuRecommendations: "Personalized picks",
    navMenuPrivacy: "Privacy",
    navAccount: "My account",
    navSignIn: "Sign in",
    saved: "Saved venues",
    joinList: "Join the list",
    arComingSoon: "Arabic coming soon",
    heroEyebrowCity: "Casablanca · MA",
    heroHeadlinePrefix: "Discover",
    heroHeadlineEmphasis: "amazing experiences",
    heroHeadlineSuffix: "in Casablanca.",
    heroSubtitle:
      "Find places, activities, and experiences that match what you're looking for.",
    heroSearchPlaceholder: "Search activities or venues",
    heroExplore: "Explore all guides",
    heroStartPlanning: "Explore Experiences",
    heroTagWeekend: "Weekend ideas",
    heroTagOutdoor: "Outdoor",
    heroTagUnder200: "Budget-friendly",
    heroTagDateNight: "Date night",
    heroTagWithKids: "With kids",
    heroTagTonight: "Evening plans",
    categoriesEyebrow: "Browse",
    categoriesTitlePrefix: "Every mood",
    categoriesTitleEmphasis: "has a category",
    categoriesRight:
      "Choose a category to start exploring — or jump between moods.",
    categoriesNotSurePrompt: "Not sure what to do?",
    categoriesNotSureCta: "Try the Smart Planner →",
    curatedEyebrow: "Picks",
    curatedTitlePrefix: "Top",
    curatedTitleEmphasis: "picks",
    curatedTitleSuffix: "chosen with care.",
    curatedRight:
      "Selected activity ideas — picked for fit, not paid placement.",
    mapEyebrow: "Map",
    mapTitlePrefix: "See the city",
    mapTitleEmphasis: "as a map",
    mapTitleSuffix: "not a list.",
    mapActivities: "Curated ideas",
    mapNeighborhoods: "Across Casablanca",
    mapOpen: "Open map",
    howEyebrow: "How it works",
    howTitlePrefix: "Pick a mood,",
    howTitleEmphasis: "see what's real",
    howTitleSuffix: "go.",
    footerCtaTitlePrefix: "Be first to know",
    footerCtaTitleEmphasis: "what's next",
    footerCtaSubtitle: "Join the list for product updates, new features, and selected Casablanca ideas as Blaniko grows.",
    footerEmailPlaceholder: "your@email.com",
    footerSmallNote: "We'll only email you about Blaniko updates and selected Casablanca ideas.",
    editorialEyebrow: "Blaniko Pick · Family Night",
    editorialTitlePrefix: "Movie night,",
    editorialTitleEmphasis: "made easier.",
    editorialTitleSuffix: "",
    editorialDescription:
      "A cosy indoor idea for families, couples, or friends — start with a film, then keep the evening simple nearby.",
    editorialRead: "Explore guides",
    compareLabel: "Compare",
    compareSelected: "{count} activities selected",
    compareClear: "Clear",
    compareGo: "Compare",
    waitlistSuccess: "You're on the list. We'll keep you updated as Blaniko grows.",
    waitlistError: "Something went wrong. Please try again.",
    waitlistJoining: "Joining...",
    waitlistDuplicate: "You're already on the list.",
    waitlistInvalidEmail: "Please enter a valid email address.",
    aboutEyebrow: "About Blaniko",
    aboutTitlePrefix: "Casablanca has more to do than you think.",
    aboutTitleEmphasis: "We help you find it.",
    aboutBody: "Blaniko is a local guide to activities, sports, games, outdoor experiences, and family outings in Casablanca. We bring together carefully selected ideas, useful details, and clear information to help you discover what the city has to offer.",
    footerPrivacyLink: "Privacy Policy",
    footerForVenues: "For venues",
    navThemeToLight: "Switch to light mode",
    navThemeToDark: "Switch to dark mode",
    skipToMain: "Skip to main content",
  },
  categoryNames: {
    activities: "Activities",
    sports: "Sports",
    gaming: "Gaming",
    outdoor: "Outdoor",
    family: "Family",
    all: "All venues",
  },
  categoryDescriptions: {
    activities: "Experiences to break your routine and explore Casablanca.",
    sports: "Padel, fitness, and active vibes around town.",
    gaming: "Arcades, lounges, and social gaming spots.",
    outdoor: "Fresh-air plans around Casablanca neighborhoods.",
    family: "Kid-friendly venues and family activities.",
    all: "Discover activities, sports, gaming, outdoor spots, and family venues across Casablanca.",
  },
  categoryPage: {
    backHome: "Back to categories",
    eyebrow: "Casablanca category",
    allVenuesEyebrow: "Casablanca guide",
    notFoundTitle: "Category not found",
    notFoundDescription:
      "Sorry, we could not find this category yet. Try another one from the homepage.",
    results: "venues",
    result: "venue",
    findingPlaces: "Finding places\u2026",
    toExplore: "to explore",
    emptyFilterTitle: "Use it as a filter",
    emptyComingSoonTitle: "Coming soon",
    emptyComingSoonDescBefore: "We're adding",
    emptyComingSoonDescAfter: "venues to Blaniko. Check back soon — or explore what's already live.",
    browseAll: "Browse all venues \u2192",
    couplesRedirectTitle: "Date-friendly plans",
    couplesRedirectDesc: "Couples is a filter lens, not a single venue type. Browse places that work well for a date or a plan for two.",
    couplesCta: "Browse date spots \u2192",
    friendsRedirectTitle: "Group plans",
    friendsRedirectDesc: "Friends can mean billiards, escape rooms, gaming, padel, and more. Browse places that work well for a group outing.",
    friendsCta: "Browse group plans \u2192",
    // redesign strings
    sidebarEyebrow: "Find your perfect experience",
    sidebarTitle: "Refine your search",
    searchVenues: "Search venues\u2026",
    sortBy: "Sort by",
    sortRecommended: "Recommended",
    sortAZ: "A \u2013 Z",
    filtersLabel: "Filters",
    clearAll: "Clear all",
    locationLabel: "Location",
    locationAll: "All Casablanca",
    goodForLabel: "Good for",
    goodForAll: "All",
    timeLabel: "Time",
    timeAny: "Any time",
    timeMorning: "Morning",
    timeAfternoon: "Afternoon",
    timeEvening: "Evening",
    timeLateNight: "Late-night",
    subcatLabel: "Activity type",
    topPicksTitle: "Top picks",
    topPicksLink: "See all venues",
    featuredBadge: "Featured",
    allVenuesTitle: "All venues",
    moreVenuesTitle: "More venues",
    showingCount: "Showing",
    showingMoreCount: "Showing {count} more venues",
    noVenuesTitle: "No venues match those filters",
    noVenuesSub: "Try widening your search or clearing a filter.",
    clearFilters: "Clear filters",
    exploreMore: "Explore more",
    planCtaTitle: "Try the Smart Planner",
    planCtaSub: "Preview Blaniko's planning experience — pick a vibe and get a ready-to-go outing route.",
    planCtaBtn: "Try it out",
    filtersBtn: "Filters",
    gridView: "Grid view",
    listView: "List view",
    explore: "Explore",
  },
  notFoundPage: {
    title: "Page not found",
    description: "This page doesn't exist or may have moved. Head back to discover places in Casablanca.",
    backToHome: "Back to home",
    browseVenues: "Browse venues",
  },
  loginPage: {
    title: "Sign in",
    subtitle: "Enter your email and we'll send you a magic link — no password needed.",
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    submitBtn: "Send magic link",
    submitting: "Sending…",
    successTitle: "Check your inbox",
    successDesc: "We sent a sign-in link to your email. Click it to continue.",
    backToHome: "Back to home",
    errorGeneric: "Something went wrong. Please try again.",
    notConfigured: "Auth is not available right now.",
  },
  accountPage: {
    title: "My account",
    loggedInAs: "Signed in as",
    logOutBtn: "Sign out",
    logOutting: "Signing out…",
    guestTitle: "You're browsing as a guest",
    guestDesc: "Sign in to access your account across devices.",
    loginBtn: "Sign in",
    backToHome: "Back to home",
  },
  venueCard: {
    featured: "Featured",
    viewDetails: "Explore",
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
    loading: "Loading venue\u2026",
    overview: "Overview",
    area: "Area",
    vibe: "Vibe",
    audience: "Audience",
    priceLevel: "Price level",
    fallbackOverview:
      "Explore {name}, a {category} spot in {area}. Use the details on this page to decide if it fits your next outing.",
    fallbackVibe: "Casual",
    fallbackAudience: "General",
    fallbackPriceLevel: "$$",
    saveFavorite: "Save to favorites",
    removeFavorite: "Remove from favorites",
    unknownCategory: "Venue",
    actionOpenMaps: "Open in Maps",
    actionCall: "Call",
    actionWhatsApp: "WhatsApp",
    actionWebsite: "Website",
    actionInstagram: "Instagram",
    actionContactSoon: "Contact details coming soon",
    trustCollected: "Blaniko profile",
    trustCollectedSub: "Information collected from public sources",
    trustConfirmed: "Venue confirmed",
    trustVerified: "Blaniko verified",
    trustLastUpdated: "Last updated",
  },
  searchPage: {
    pageTitle: "Discover venues in Casablanca | Blaniko",
    pageDescription: "Search and filter activities, venues, and experiences in Casablanca.",
    eyebrow: "Discovery results",
    titleDefault: "Explore matching venues",
    titleForQuery: 'Results for "{query}"',
    moodPicksTitle: "{mood} mood picks",
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
    emptyTitle: "Nothing quite fits — yet.",
    emptyDescription:
      "Try another keyword, category, or budget to discover more venues.",
    resultsLabel: "results",
    resultsInCity: "results in Casablanca",
    findingPlaces: "Finding places\u2026",
    searchPlaceholder: "Search places, categories, or areas",
    searchAction: "Search",
    curatedPlaces: "curated places",
    handpickedUpdated: "Handpicked \u00b7 regularly refreshed",
  },
  recommendationsPage: {
    eyebrow: "Personal recommendations",
    title: "What do you feel like doing?",
    subtitle: "Answer 5 quick questions and we'll find the best spots in Casablanca for you.",
    query: "Query",
    category: "Category",
    budget: "Budget",
    backHome: "Back to homepage",
  },
  favoritesPage: {
    pageTitle: "Saved venues | Blaniko",
    eyebrow: "Saved places",
    title: "Your favorite venues",
    subtitle: "Keep your preferred Casablanca spots in one place.",
    savedLabel: "saved",
    clearAll: "Clear all",
    clearConfirm: "Clear all saved venues? This cannot be undone.",
    clearConfirmYes: "Yes, clear all",
    clearConfirmCancel: "Cancel",
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
    loading: "Loading venues…",
    emptyTitle: "No map matches",
    emptyDescription: "Try another keyword, category, or budget.",
    noCoordsTitle: "Mapping in progress",
    noCoordsDescription: "Map locations are being set up. Browse all venues in the list below.",
    errorTitle: "Couldn't load venues",
    errorDescription: "Check your connection and try again.",
    showOnMap: "Show on map",
    selectedLabel: "Selected",
    viewDetails: "View details",
    venues: "venues",
    lessFilters: "Hide filters",
  },
  adminPage: {
    eyebrow: "Venue management",
    title: "Admin venue dashboard",
    subtitle: "Review and update published venue information.",
    helper:
      "Changes are saved through the secure admin API.",
    listTitle: "Venue list",
    createAction: "Create new venue",
    editAction: "Edit",
    resetAction: "Reset form",
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
    savedFeedback: "Venue saved.",
    deletedFeedback: "Venue removed.",
    errNameRequired: "Name is required.",
    errCategoryRequired: "Category is required.",
    errAreaRequired: "Area is required.",
    errBudgetFormat: "Budget must be $, $$ or $$$.",
    errShortDescriptionRequired: "Short description is required.",
    errCoordsBothRequired: "Both latitude and longitude are required together.",
    errLatitudeRange: "Latitude must be between -90 and 90.",
    errLongitudeRange: "Longitude must be between -180 and 180.",
  },
  common: {
    apiError: "Blaniko is having trouble loading places right now. Please try again in a moment.",
    retry: "Try again",
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
    navExplore: "Accueil",
    navCategories: "Catégories",
    navCurated: "Sélection",
    navMap: "Carte",
    navSearch: "Explorer",
    navGuides: "Guides",
    navPlan: "Plan",
    navForVenues: "Pour les établissements",
    navContact: "Contact",
    navMenuExploreBlaniko: "Explorer Blaniko",
    navMenuCategories: "Catégories",
    navMenuMore: "Plus",
    navMenuRecommendations: "Idées personnalisées",
    navMenuPrivacy: "Confidentialité",
    navAccount: "Mon compte",
    navSignIn: "Se connecter",
    saved: "Lieux enregistrés",
    joinList: "Rejoindre la liste",
    arComingSoon: "Arabe bientôt disponible",
    heroEyebrowCity: "Casablanca · MA",
    heroHeadlinePrefix: "Découvrez",
    heroHeadlineEmphasis: "des expériences incroyables",
    heroHeadlineSuffix: "à Casablanca.",
    heroSubtitle:
      "Trouvez des lieux, des activités et des expériences qui correspondent à ce que vous cherchez.",
    heroSearchPlaceholder: "Rechercher des activités ou des lieux",
    heroExplore: "Explorer tous les guides",
    heroStartPlanning: "Explorer les expériences",
    heroTagWeekend: "Idées week-end",
    heroTagOutdoor: "En plein air",
    heroTagUnder200: "Petit budget",
    heroTagDateNight: "Soirée en duo",
    heroTagWithKids: "Avec enfants",
    heroTagTonight: "Plans du soir",
    categoriesEyebrow: "Explorer",
    categoriesTitlePrefix: "Chaque ambiance",
    categoriesTitleEmphasis: "a sa catégorie",
    categoriesRight:
      "Choisissez une catégorie pour commencer — ou passez d'une ambiance à l'autre.",
    categoriesNotSurePrompt: "Vous ne savez pas quoi faire ?",
    categoriesNotSureCta: "Essayer le planificateur →",
    curatedEyebrow: "Sélection",
    curatedTitlePrefix: "Nos meilleures",
    curatedTitleEmphasis: "idées",
    curatedTitleSuffix: "choisies avec soin.",
    curatedRight:
      "Des idées de sorties sélectionnées — choisies pour leur intérêt, pas pour un placement payé.",
    mapEyebrow: "Carte",
    mapTitlePrefix: "Voyez la ville",
    mapTitleEmphasis: "comme une carte",
    mapTitleSuffix: "pas comme une liste.",
    mapActivities: "Idées sélectionnées",
    mapNeighborhoods: "À travers Casablanca",
    mapOpen: "Ouvrir la carte",
    howEyebrow: "Fonctionnement",
    howTitlePrefix: "Choisissez une envie,",
    howTitleEmphasis: "voyez ce qui est concret",
    howTitleSuffix: "partez.",
    footerCtaTitlePrefix: "Soyez les premiers à découvrir",
    footerCtaTitleEmphasis: "la suite",
    footerCtaSubtitle: "Rejoignez la liste pour recevoir les nouveautés du produit, les nouvelles fonctionnalités et des idées sélectionnées à Casablanca à mesure que Blaniko évolue.",
    footerEmailPlaceholder: "votre@email.com",
    footerSmallNote: "Nous vous écrirons uniquement pour les nouveautés Blaniko et des idées sélectionnées à Casablanca.",
    editorialEyebrow: "Sélection Blaniko · Soirée famille",
    editorialTitlePrefix: "Soirée ciné,",
    editorialTitleEmphasis: "en plus simple.",
    editorialTitleSuffix: "",
    editorialDescription:
      "Une idée cosy en intérieur pour les familles, les couples ou les amis — un film d'abord, la suite vient naturellement.",
    editorialRead: "Explorer les guides",
    compareLabel: "Comparer",
    compareSelected: "{count} activités sélectionnées",
    compareClear: "Effacer",
    compareGo: "Comparer",
    waitlistSuccess: "Vous êtes sur la liste. On vous tient au courant au fil du développement.",
    waitlistError: "Une erreur est survenue. Veuillez réessayer.",
    waitlistJoining: "Inscription...",
    waitlistDuplicate: "Vous êtes déjà sur la liste.",
    waitlistInvalidEmail: "Veuillez entrer une adresse e-mail valide.",
    aboutEyebrow: "À propos",
    aboutTitlePrefix: "Casablanca a bien plus à offrir que vous ne croyez.",
    aboutTitleEmphasis: "On est là pour ça.",
    aboutBody: "Blaniko est un guide local des activités, sports, jeux, expériences en plein air et sorties en famille à Casablanca. Nous réunissons des idées soigneusement sélectionnées, des détails utiles et des informations claires pour vous aider à découvrir ce que la ville a à offrir.",
    footerPrivacyLink: "Politique de confidentialité",
    footerForVenues: "Pour les établissements",
    navThemeToLight: "Passer en mode clair",
    navThemeToDark: "Passer en mode sombre",
    skipToMain: "Aller au contenu principal",
  },
  categoryNames: {
    activities: "Activités",
    sports: "Sports",
    gaming: "Gaming",
    outdoor: "Plein air",
    family: "Famille",
    all: "Tous les lieux",
  },
  categoryDescriptions: {
    activities: "Des expériences pour changer de routine et explorer Casablanca.",
    sports: "Padel, fitness et activités dynamiques en ville.",
    gaming: "Arcades, lounges et espaces gaming conviviaux.",
    outdoor: "Des idées de sorties en plein air dans Casablanca.",
    family: "Des lieux et activités adaptés aux familles.",
    all: "Découvrez activités, sports, gaming, espaces outdoor et sorties famille à Casablanca.",
  },
  categoryPage: {
    backHome: "Retour aux catégories",
    eyebrow: "Catégorie à Casablanca",
    allVenuesEyebrow: "Guide Casablanca",
    notFoundTitle: "Catégorie introuvable",
    notFoundDescription:
      "Désolé, cette catégorie n'est pas encore disponible. Essayez une autre catégorie depuis l'accueil.",
    results: "lieux",
    result: "lieu",
    findingPlaces: "Recherche en cours\u2026",
    toExplore: "à explorer",
    emptyFilterTitle: "Utilisez-le comme filtre",
    emptyComingSoonTitle: "Bientôt disponible",
    emptyComingSoonDescBefore: "On ajoute bientôt des lieux",
    emptyComingSoonDescAfter: "sur Blaniko. Revenez vite — ou explorez ce qui est déjà disponible.",
    browseAll: "Explorer tous les lieux \u2192",
    couplesRedirectTitle: "Plans pour deux",
    couplesRedirectDesc: "Les sorties en couple sont un filtre, pas une catégorie unique. Explorez les lieux adaptés à un rendez-vous ou à un plan à deux.",
    couplesCta: "Voir les idées pour deux \u2192",
    friendsRedirectTitle: "Plans en groupe",
    friendsRedirectDesc: "Entre amis peut vouloir dire billard, escape room, gaming, padel, et plus encore. Explorez les lieux adaptés aux sorties en groupe.",
    friendsCta: "Voir les plans en groupe \u2192",
    // redesign strings
    sidebarEyebrow: "Trouvez votre expérience idéale",
    sidebarTitle: "Affiner votre recherche",
    searchVenues: "Rechercher des lieux\u2026",
    sortBy: "Trier par",
    sortRecommended: "Recommand\u00e9s",
    sortAZ: "A \u2013 Z",
    filtersLabel: "Filtres",
    clearAll: "Tout effacer",
    locationLabel: "Lieu",
    locationAll: "Tout Casablanca",
    goodForLabel: "Id\u00e9al pour",
    goodForAll: "Tous",
    timeLabel: "Horaire",
    timeAny: "\u00c0 toute heure",
    timeMorning: "Matin",
    timeAfternoon: "Apr\u00e8s-midi",
    timeEvening: "Soir",
    timeLateNight: "Tard le soir",
    subcatLabel: "Type d'activit\u00e9",
    topPicksTitle: "Coups de c\u0153ur",
    topPicksLink: "Voir tous les lieux",
    featuredBadge: "Coup de c\u0153ur",
    allVenuesTitle: "Tous les lieux",
    moreVenuesTitle: "Plus de lieux",
    showingCount: "Affichage de",
    showingMoreCount: "{count} lieux supplémentaires",
    noVenuesTitle: "Aucun lieu ne correspond",
    noVenuesSub: "Essayez d\u2019\u00e9largir votre recherche ou de supprimer un filtre.",
    clearFilters: "Effacer les filtres",
    exploreMore: "Explorer plus",
    planCtaTitle: "Essayer le planificateur",
    planCtaSub: "Découvrez l'expérience de planification Blaniko — choisissez une ambiance et obtenez un parcours de sortie prêt à l'emploi.",
    planCtaBtn: "Essayer",
    filtersBtn: "Filtres",
    gridView: "Vue grille",
    listView: "Vue liste",
    explore: "Explorer",
  },
  notFoundPage: {
    title: "Page introuvable",
    description: "Cette page n'existe pas ou a peut-être été déplacée. Retournez découvrir des lieux à Casablanca.",
    backToHome: "Retour à l'accueil",
    browseVenues: "Explorer les lieux",
  },
  loginPage: {
    title: "Se connecter",
    subtitle: "Entrez votre email et nous vous enverrons un lien magique — aucun mot de passe nécessaire.",
    emailLabel: "Adresse email",
    emailPlaceholder: "vous@exemple.com",
    submitBtn: "Envoyer le lien magique",
    submitting: "Envoi en cours…",
    successTitle: "Vérifiez votre boîte mail",
    successDesc: "Nous avons envoyé un lien de connexion à votre email. Cliquez dessus pour continuer.",
    backToHome: "Retour à l'accueil",
    errorGeneric: "Une erreur est survenue. Veuillez réessayer.",
    notConfigured: "L'authentification n'est pas disponible pour le moment.",
  },
  accountPage: {
    title: "Mon compte",
    loggedInAs: "Connecté en tant que",
    logOutBtn: "Se déconnecter",
    logOutting: "Déconnexion…",
    guestTitle: "Vous naviguez en tant qu'invité",
    guestDesc: "Connectez-vous pour accéder à votre compte sur tous vos appareils.",
    loginBtn: "Se connecter",
    backToHome: "Retour à l'accueil",
  },
  venueCard: {
    featured: "À la une",
    viewDetails: "Explorer",
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
    loading: "Chargement du lieu\u2026",
    overview: "Aperçu",
    area: "Quartier",
    vibe: "Ambiance",
    audience: "Public",
    priceLevel: "Niveau de prix",
    fallbackOverview:
      "Découvrez {name}, une adresse {category} à {area}. Consultez les détails de cette page pour voir si elle correspond à votre prochaine sortie.",
    fallbackVibe: "Décontracté",
    fallbackAudience: "Tout public",
    fallbackPriceLevel: "$$",
    saveFavorite: "Ajouter aux favoris",
    removeFavorite: "Retirer des favoris",
    unknownCategory: "Lieu",
    actionOpenMaps: "Ouvrir dans Maps",
    actionCall: "Appeler",
    actionWhatsApp: "WhatsApp",
    actionWebsite: "Site web",
    actionInstagram: "Instagram",
    actionContactSoon: "Coordonnées bientôt disponibles",
    trustCollected: "Profil Blaniko",
    trustCollectedSub: "Informations collectées à partir de sources publiques",
    trustConfirmed: "Confirmé par l'établissement",
    trustVerified: "Vérifié par Blaniko",
    trustLastUpdated: "Dernière mise à jour",
  },
  searchPage: {
    pageTitle: "Découvrir des lieux à Casablanca | Blaniko",
    pageDescription: "Recherchez et filtrez des activités, lieux et expériences à Casablanca.",
    eyebrow: "Résultats découverte",
    titleDefault: "Explorer les lieux correspondants",
    titleForQuery: 'Résultats pour "{query}"',
    moodPicksTitle: "Sélection ambiance {mood}",
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
    emptyTitle: "Aucun résultat ne correspond pour l'instant.",
    emptyDescription:
      "Essayez un autre mot-clé, une catégorie ou un budget pour découvrir plus d'adresses.",
    resultsLabel: "résultats",
    resultsInCity: "résultats à Casablanca",
    findingPlaces: "Recherche en cours\u2026",
    searchPlaceholder: "Rechercher des lieux, catégories ou quartiers",
    searchAction: "Rechercher",
    curatedPlaces: "lieux sélectionnés",
    handpickedUpdated: "Sélection \u00b7 régulièrement actualisé",
  },
  recommendationsPage: {
    eyebrow: "Recommandations personnalisées",
    title: "Qu'est-ce qui vous ferait plaisir ?",
    subtitle: "Répondez à 5 questions rapides et on trouve les meilleurs endroits à Casablanca pour vous.",
    query: "Recherche",
    category: "Catégorie",
    budget: "Budget",
    backHome: "Retour à l'accueil",
  },
  favoritesPage: {
    pageTitle: "Lieux enregistrés | Blaniko",
    eyebrow: "Lieux enregistrés",
    title: "Vos lieux favoris",
    subtitle: "Gardez vos adresses préférées de Casablanca au même endroit.",
    savedLabel: "enregistrés",
    clearAll: "Tout effacer",
    clearConfirm: "Supprimer tous les lieux enregistrés ? Cette action est irréversible.",
    clearConfirmYes: "Oui, tout effacer",
    clearConfirmCancel: "Annuler",
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
    loading: "Chargement des lieux…",
    emptyTitle: "Aucun résultat sur la carte",
    emptyDescription: "Essayez un autre mot-clé, une catégorie ou un budget.",
    noCoordsTitle: "Carte en préparation",
    noCoordsDescription: "Les positions sur la carte sont en cours de configuration. Parcourez tous les lieux dans la liste ci-dessous.",
    errorTitle: "Impossible de charger les lieux",
    errorDescription: "Vérifiez votre connexion et réessayez.",
    showOnMap: "Voir sur la carte",
    selectedLabel: "Sélectionné",
    viewDetails: "Voir les détails",
    venues: "lieux",
    lessFilters: "Masquer les filtres",
  },
  adminPage: {
    eyebrow: "Gestion des lieux",
    title: "Tableau de bord admin des lieux",
    subtitle: "Vérifiez et mettez à jour les informations publiées des établissements.",
    helper:
      "Les modifications sont enregistrées via l'API admin sécurisée.",
    listTitle: "Liste des lieux",
    createAction: "Créer un nouveau lieu",
    editAction: "Modifier",
    resetAction: "Réinitialiser le formulaire",
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
    savedFeedback: "Établissement enregistré.",
    deletedFeedback: "Établissement supprimé.",
    errNameRequired: "Le nom est requis.",
    errCategoryRequired: "La catégorie est requise.",
    errAreaRequired: "Le quartier est requis.",
    errBudgetFormat: "Le budget doit être $, $$ ou $$$.",
    errShortDescriptionRequired: "La description courte est requise.",
    errCoordsBothRequired: "Latitude et longitude sont requises ensemble.",
    errLatitudeRange: "La latitude doit être entre -90 et 90.",
    errLongitudeRange: "La longitude doit être entre -180 et 180.",
  },
  common: {
    apiError: "Blaniko rencontre un problème pour charger les lieux pour le moment. Veuillez réessayer dans un instant.",
    retry: "Réessayer",
  },
};

const dictionaries: Record<AppLanguage, Dictionary> = {
  en,
  fr,
};

export function getDictionary(language: AppLanguage): Dictionary {
  return dictionaries[language];
}
