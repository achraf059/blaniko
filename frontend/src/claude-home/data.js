const localizedHomeData = {
  en: {
    heroCards: [
      { id: "c1", title: "Padel at Ocean Drive", tagline: "Ain Diab · Sport", price: "MAD 450", img: "p2", venueSlug: "ocean-drive-padel-club" },
      { id: "c2", title: "Rooftop Sundowner", tagline: "Maarif · Café", price: "MAD 120", img: "p3", venueSlug: "skyline-rooftop-cafe" },
      { id: "c3", title: "Old Medina Food Walk", tagline: "Old Medina · Culture", price: "Free", img: "p4", venueSlug: "old-medina-food-walk" },
      { id: "c4", title: "Night out in Maarif", tagline: "Maarif · Social", price: "MAD 220", img: "p1", venueSlug: "weekend-social-hub" },
    ],
    moods: [
      { title: "Tonight", sub: "after 7pm", ico: "moon", href: "/search?mood=social" },
      { title: "Under MAD 200", sub: "budget picks", ico: "coin", href: "/search?budget=$" },
      { title: "Date night", sub: "for two", ico: "heart2", href: "/search?category=couples" },
      { title: "With friends", sub: "3+ people", ico: "users", href: "/search?category=friends" },
    ],
    mapPins: [
      { top: 38, left: 28, label: "Ain Diab", areaQuery: "Ain Diab" },
      { top: 52, left: 48, label: "Corniche", areaQuery: "Corniche" },
      { top: 30, left: 62, label: "Triangle d'Or", areaQuery: "Triangle d'Or" },
      { top: 64, left: 72, label: "Old Medina", areaQuery: "Old Medina" },
      { top: 72, left: 40, label: "Anfa", areaQuery: "Anfa" },
      { top: 22, left: 45, label: "Sidi Bernoussi", areaQuery: "Sidi Bernoussi" },
    ],
    categories: [
      { name: "By the Water", count: "Coastal plans", img: "/category-images/by-the-water/category-by-the-water-01.png", slug: "activities" },
      { name: "Cafés & Chill", count: "Coffee & slow afternoons", img: "/category-images/cafes-chill/category-cafes-chill-01.png", slug: "activities" },
      { name: "Sports & Play", count: "Active social plans", img: "/category-images/sports-play/category-sports-play-01.png", slug: "sports" },
      { name: "Family Days", count: "Family-friendly picks", img: "/category-images/family-days/category-family-days-01.png", slug: "family" },
      { name: "Create & Learn", count: "Hands-on experiences", img: "/category-images/create-learn/category-create-learn-01.png", slug: "activities" },
      { name: "Evening Plans", count: "Warm night ideas", img: "/category-images/evening-plans/category-evening-plans-01.png", slug: "friends" },
      { name: "Outdoor Escapes", count: "Fresh-air plans", img: "/category-images/outdoor-escapes/category-outdoor-escapes-01.png", slug: "outdoor" },
      { name: "Culture & Local", count: "Art, craft & local finds", img: "/category-images/culture-local/category-culture-local-01.png", slug: "activities" },
    ],
    curated: [
      { title: "A slow morning at the corniche", chips: ["Morning", "Outdoor"], price: "Free", duration: "2h", img: "c1", venueSlug: "marina-sunset-walk" },
      { title: "Pottery with Leïla", chips: ["Workshop"], price: "MAD 320", duration: "3h", img: "c3", venueSlug: "anfa-family-workshop-house" },
      { title: "Dinner at Moonlight Bistro", chips: ["Dinner"], price: "MAD 150", duration: "2h", img: "c4", venueSlug: "moonlight-bistro" },
      { title: "Padel session, Ain Diab", chips: ["Sport"], price: "MAD 280", duration: "4h", img: "c2", venueSlug: "ocean-drive-padel-club" },
      { title: "Rooftop supper club", chips: ["Dining", "Curated"], price: "MAD 480", duration: "3h", img: "c5", venueSlug: "skyline-rooftop-cafe" },
      { title: "Street food in the Old Medina", chips: ["Culture", "Food"], price: "MAD 180", duration: "2h", img: "c6", venueSlug: "old-medina-food-walk" },
    ],
    howSteps: [
      {
        title: "Pick a mood.",
        description:
          "Browse by how you're feeling — quiet morning, social evening, something active, something new.",
      },
      {
        title: "See what's real.",
        description:
          "Every pick shows the real price, the real duration, and what makes it worth going — before you commit.",
      },
      {
        title: "Save or share.",
        description:
          "Save what interests you. Share with whoever you're going with. Come back when the moment is right.",
      },
    ],
    continuationSlots: ["Slot 01", "Slot 02", "Slot 03", "Slot 04"],
    editorialMeta: {
      author: "Leïla Bensaïd",
      readTime: "6 min read",
    },
    footer: {
      madeIn: "© 2026 Blaniko · Made in Casablanca",
      instagram: "Instagram",
      contact: "Contact",
      privacy: "Privacy",
    },
  },
  fr: {
    heroCards: [
      { id: "c1", title: "Padel à Ocean Drive", tagline: "Ain Diab · Sport", price: "MAD 450", img: "p2", venueSlug: "ocean-drive-padel-club" },
      { id: "c2", title: "Coucher de soleil en rooftop", tagline: "Maarif · Café", price: "MAD 120", img: "p3", venueSlug: "skyline-rooftop-cafe" },
      { id: "c3", title: "Balade gourmande en médina", tagline: "Ancienne Médina · Culture", price: "Gratuit", img: "p4", venueSlug: "old-medina-food-walk" },
      { id: "c4", title: "Soirée à Maarif", tagline: "Maarif · Social", price: "MAD 220", img: "p1", venueSlug: "weekend-social-hub" },
    ],
    moods: [
      { title: "Ce soir", sub: "après 19h", ico: "moon", href: "/search?mood=social" },
      { title: "Moins de 200 MAD", sub: "sélection budget", ico: "coin", href: "/search?budget=$" },
      { title: "Soirée en duo", sub: "pour deux", ico: "heart2", href: "/search?category=couples" },
      { title: "Entre amis", sub: "3+ personnes", ico: "users", href: "/search?category=friends" },
    ],
    mapPins: [
      { top: 38, left: 28, label: "Ain Diab", areaQuery: "Ain Diab" },
      { top: 52, left: 48, label: "Corniche", areaQuery: "Corniche" },
      { top: 30, left: 62, label: "Triangle d'Or", areaQuery: "Triangle d'Or" },
      { top: 64, left: 72, label: "Ancienne Médina", areaQuery: "Old Medina" },
      { top: 72, left: 40, label: "Anfa", areaQuery: "Anfa" },
      { top: 22, left: 45, label: "Sidi Bernoussi", areaQuery: "Sidi Bernoussi" },
    ],
    categories: [
      { name: "Au bord de l'eau", count: "Plans côtiers", img: "/category-images/by-the-water/category-by-the-water-01.png", slug: "activities" },
      { name: "Cafés & Détente", count: "Cafés et après-midi calmes", img: "/category-images/cafes-chill/category-cafes-chill-01.png", slug: "activities" },
      { name: "Sports & Jeux", count: "Plans actifs en groupe", img: "/category-images/sports-play/category-sports-play-01.png", slug: "sports" },
      { name: "En famille", count: "Idées adaptées aux familles", img: "/category-images/family-days/category-family-days-01.png", slug: "family" },
      { name: "Créer & Apprendre", count: "Expériences pratiques", img: "/category-images/create-learn/category-create-learn-01.png", slug: "activities" },
      { name: "Soirées", count: "Idées de soirées chaleureuses", img: "/category-images/evening-plans/category-evening-plans-01.png", slug: "friends" },
      { name: "Évasions nature", count: "Plans grand air", img: "/category-images/outdoor-escapes/category-outdoor-escapes-01.png", slug: "outdoor" },
      { name: "Culture & Local", count: "Art, artisanat et trouvailles locales", img: "/category-images/culture-local/category-culture-local-01.png", slug: "activities" },
    ],
    curated: [
      { title: "Une matinée douce à la corniche", chips: ["Matin", "Plein air"], price: "Gratuit", duration: "2h", img: "c1", venueSlug: "marina-sunset-walk" },
      { title: "Poterie avec Leïla", chips: ["Atelier"], price: "MAD 320", duration: "3h", img: "c3", venueSlug: "anfa-family-workshop-house" },
      { title: "Dîner au Moonlight Bistro", chips: ["Dîner"], price: "MAD 150", duration: "2h", img: "c4", venueSlug: "moonlight-bistro" },
      { title: "Session padel, Ain Diab", chips: ["Sport"], price: "MAD 280", duration: "4h", img: "c2", venueSlug: "ocean-drive-padel-club" },
      { title: "Dîner rooftop en petit comité", chips: ["Dîner", "Sélection"], price: "MAD 480", duration: "3h", img: "c5", venueSlug: "skyline-rooftop-cafe" },
      { title: "Street food dans l'Ancienne Médina", chips: ["Culture", "Food"], price: "MAD 180", duration: "2h", img: "c6", venueSlug: "old-medina-food-walk" },
    ],
    howSteps: [
      {
        title: "Choisissez une ambiance.",
        description:
          "Parcourez selon votre envie — matin calme, soirée sociale, quelque chose d'actif ou de nouveau.",
      },
      {
        title: "Voyez ce qui est réel.",
        description:
          "Chaque sélection indique le vrai prix, la vraie durée et ce qui vaut le déplacement — avant de vous décider.",
      },
      {
        title: "Enregistrez ou partagez.",
        description:
          "Sauvegardez ce qui vous intéresse. Partagez avec ceux qui vous accompagnent. Revenez quand le moment est venu.",
      },
    ],
    continuationSlots: ["Bloc 01", "Bloc 02", "Bloc 03", "Bloc 04"],
    editorialMeta: {
      author: "Leïla Bensaïd",
      readTime: "6 min de lecture",
    },
    footer: {
      madeIn: "© 2026 Blaniko · Fait à Casablanca",
      instagram: "Instagram",
      contact: "Contact",
      privacy: "Confidentialité",
    },
  },
};

export function getClaudeHomeLocalizedData(language) {
  return localizedHomeData[language] ?? localizedHomeData.en;
}

export const HERO_CARDS = localizedHomeData.en.heroCards;
export const CATEGORIES = localizedHomeData.en.categories;
export const CURATED = localizedHomeData.en.curated;

if (typeof window !== "undefined") {
  Object.assign(window, { HERO_CARDS, CATEGORIES, CURATED, getClaudeHomeLocalizedData });
}
