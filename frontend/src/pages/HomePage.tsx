import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useNavigate } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { HomeHero } from "../components/home/HomeHero";
import { VenueCard } from "../components/home/VenueCard";
import { areaProfiles } from "../data/areas";
import {
  editorialCollections,
  featuredEditorialCollections,
  resolveEditorialCollectionVenues,
} from "../data/editorialCollections";
import { categories, featuredVenueSlugs } from "../data/mockData";
import {
  discoveryMoodLabel,
  explainVenueMatch,
  isDiscoveryMood,
  venueMatchesMood,
} from "../utils/discoveryInsights";
import { useVenues } from "../hooks/useVenues";
import { useFavorites } from "../hooks/useFavorites";
import { useCollections } from "../hooks/useCollections";
import {
  type RecentActivityType,
  useRecentActivity,
} from "../hooks/useRecentActivity";
import { useI18n } from "../i18n/useI18n";
import "./HomePage.css";

const activityTypeLabel: Record<RecentActivityType, string> = {
  venue: "Venue",
  guide: "Guide",
  area: "Neighborhood",
  outing: "Outing",
};

function formatRecentTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString();
}

type PersonalSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  reason: string;
  actionLabel: string;
};

type PersonalizationContext = {
  dominantAreaSlug?: string;
  dominantCategory?: string;
  recentMood?: string;
  moodTrail: string[];
  recentPlannerStyle?: string;
};

const planStyleLabelMap: Record<string, string> = {
  "date-night": "date night",
  "friends-hangout": "friends hangout",
  "chill-solo-reset": "solo reset",
  "under-100-mad": "budget outing",
  "productive-afternoon": "productive afternoon",
  "sunset-plan": "sunset outing",
  "family-afternoon": "family afternoon",
};

const planStyleBestForHints: Record<string, string[]> = {
  "date-night": ["date-spot", "sunset-spot"],
  "friends-hangout": ["friends", "late-night"],
  "chill-solo-reset": ["solo-coffee", "work-friendly"],
  "under-100-mad": ["budget-pick"],
  "productive-afternoon": ["work-friendly", "solo-coffee"],
  "sunset-plan": ["sunset-spot", "date-spot"],
  "family-afternoon": ["family-friendly"],
};

const areaAliasBySlug: Record<string, string[]> = {
  "ain-diab": ["ain diab"],
  "old-medina": ["old medina"],
};

function findAreaSlugFromText(value: string): string | undefined {
  const normalized = value.toLowerCase();

  for (const area of areaProfiles) {
    const directMatch = normalized.includes(area.slug.replace(/-/g, " "));
    const aliasMatch = (areaAliasBySlug[area.slug] ?? []).some((alias) =>
      normalized.includes(alias),
    );

    if (directMatch || aliasMatch) {
      return area.slug;
    }
  }

  return undefined;
}

function toAreaQueryValue(areaSlug: string): string {
  return areaSlug.replace(/-/g, " ");
}

function toMoodLabel(value: string): string {
  if (isDiscoveryMood(value)) {
    return discoveryMoodLabel[value];
  }

  return value;
}

const moodCards = [
  {
    slug: "chill",
    title: "Chill reset",
    subtitle: "Quiet coffee corners, calm walks, and easy spots.",
    href: "/search?mood=chill",
  },
  {
    slug: "social",
    title: "Social energy",
    subtitle: "Group-friendly venues and lively city plans.",
    href: "/search?mood=social",
  },
  {
    slug: "active",
    title: "Move your body",
    subtitle: "Sports, fitness, and outdoor plans around town.",
    href: "/search?mood=active",
  },
  {
    slug: "romantic",
    title: "Date mood",
    subtitle: "Intimate dinner picks and sunset-ready places.",
    href: "/search?mood=romantic",
  },
  {
    slug: "family-friendly",
    title: "Family time",
    subtitle: "Safe, kid-friendly, low-stress weekend options.",
    href: "/search?mood=family-friendly",
  },
];

export default function HomePage() {
  const { dictionary } = useI18n();
  const navigate = useNavigate();
  const { venues } = useVenues();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { collections } = useCollections();
  const { activities } = useRecentActivity();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined,
  );
  const [selectedBudget, setSelectedBudget] = useState("all");
  const recentPreview = activities.slice(0, 6);

  const featuredVenues = featuredVenueSlugs
    .map((slug) => venues.find((venue) => venue.slug === slug))
    .filter((venue): venue is (typeof venues)[number] => venue !== undefined);

  const featuredGuides = featuredEditorialCollections.slice(0, 3);

  const favoriteSlugSet = useMemo(
    () =>
      new Set(
        venues
          .filter((venue) => isFavorite(venue.slug))
          .map((venue) => venue.slug),
      ),
    [isFavorite, venues],
  );

  const collectionVenueSlugSet = useMemo(
    () => new Set(collections.flatMap((collection) => collection.venueSlugs)),
    [collections],
  );

  const personalizationContext = useMemo<PersonalizationContext>(() => {
    const recentAreaActivity = activities.find(
      (activity) => activity.type === "area",
    );
    const recentVenueActivity = activities.find(
      (activity) => activity.type === "venue",
    );
    const recentOuting = activities.find(
      (activity) => activity.type === "outing",
    );

    const favoriteAndCollectionVenues = venues.filter(
      (venue) =>
        favoriteSlugSet.has(venue.slug) ||
        collectionVenueSlugSet.has(venue.slug),
    );

    const dominantCategory = (() => {
      if (favoriteAndCollectionVenues.length === 0) {
        return undefined;
      }

      const counts = new Map<string, number>();
      favoriteAndCollectionVenues.forEach((venue) => {
        counts.set(
          venue.categorySlug,
          (counts.get(venue.categorySlug) ?? 0) + 1,
        );
      });

      return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    })();

    const dominantAreaSlug = (() => {
      if (recentAreaActivity) {
        return recentAreaActivity.id;
      }

      if (recentVenueActivity) {
        const fromTitle = findAreaSlugFromText(recentVenueActivity.title);
        if (fromTitle) {
          return fromTitle;
        }

        const fromHref = findAreaSlugFromText(recentVenueActivity.href);
        if (fromHref) {
          return fromHref;
        }
      }

      const favoriteAreaHit = favoriteAndCollectionVenues
        .map((venue) => findAreaSlugFromText(venue.area))
        .find(Boolean);
      return favoriteAreaHit;
    })();

    const moodTrail = (() => {
      const moods = new Set<string>();

      for (const activity of activities) {
        const queryIndex = activity.href.indexOf("?");
        if (queryIndex >= 0) {
          const params = new URLSearchParams(
            activity.href.slice(queryIndex + 1),
          );
          const mood = params.get("mood");
          if (mood) {
            moods.add(mood);
          }
        }

        if (activity.type === "guide") {
          const guideMood = editorialCollections.find(
            (guide) => guide.slug === activity.id,
          )?.theme?.mood;
          if (guideMood) {
            moods.add(guideMood);
          }
        }

        if (moods.size >= 3) {
          break;
        }
      }

      return [...moods].slice(0, 3);
    })();

    return {
      dominantAreaSlug,
      dominantCategory,
      recentMood: moodTrail[0],
      moodTrail,
      recentPlannerStyle: recentOuting?.id.split(":")[0],
    };
  }, [activities, collectionVenueSlugSet, favoriteSlugSet, venues]);

  const personalizedSuggestions = useMemo<PersonalSuggestion[]>(() => {
    const suggestions: PersonalSuggestion[] = [];
    const recentGuideActivityIds = new Set(
      activities
        .filter((activity) => activity.type === "guide")
        .map((activity) => activity.id),
    );
    const {
      dominantAreaSlug,
      dominantCategory,
      recentMood,
      recentPlannerStyle,
      moodTrail,
    } = personalizationContext;

    if (dominantAreaSlug) {
      const area = areaProfiles.find(
        (candidate) => candidate.slug === dominantAreaSlug,
      );
      if (area) {
        suggestions.push({
          id: `area-${area.slug}`,
          title: `Still exploring ${area.name}?`,
          subtitle: area.curatedHint,
          href: `/areas/${area.slug}`,
          reason: "Because you viewed this neighborhood recently",
          actionLabel: `Open ${area.name}`,
        });
      }
    }

    if (recentMood) {
      const moodName = toMoodLabel(recentMood);
      suggestions.push({
        id: `mood-${recentMood}`,
        title: `More ${moodName.toLowerCase()} matches`,
        subtitle: "Keep your discovery flow going with mood-aligned places.",
        href: `/search?mood=${encodeURIComponent(recentMood)}`,
        reason:
          moodTrail.length > 1
            ? `Good match for your recent ${moodTrail.map(toMoodLabel).join(" + ")} exploration`
            : "Good match for your recent mood exploration",
        actionLabel: `Explore ${moodName.toLowerCase()} spots`,
      });
    }

    if (dominantCategory) {
      const categoryName = categories.find(
        (category) => category.slug === dominantCategory,
      )?.name;
      suggestions.push({
        id: `category-${dominantCategory}`,
        title: `You keep saving ${categoryName ?? dominantCategory} places`,
        subtitle:
          "Here are more options similar to your favorites and saved lists.",
        href: `/search?category=${encodeURIComponent(dominantCategory)}`,
        reason: "Similar to your saved places",
        actionLabel: `See more ${categoryName ?? "spots"}`,
      });
    }

    if (recentPlannerStyle || dominantAreaSlug || recentMood) {
      const params = new URLSearchParams();

      if (recentPlannerStyle) {
        params.set("style", recentPlannerStyle);
      }

      if (dominantAreaSlug) {
        params.set("area", toAreaQueryValue(dominantAreaSlug));
      }

      if (recentMood) {
        params.set("mood", recentMood);
      }

      suggestions.push({
        id: "planner-refresh",
        title: recentPlannerStyle
          ? `Plan another ${planStyleLabelMap[recentPlannerStyle] ?? "signature"} outing`
          : "Plan another outing",
        subtitle:
          dominantAreaSlug || recentMood
            ? "Generate a new route aligned with your recent city context."
            : "Generate a fresh route with your preferred style.",
        href: params.toString() ? `/plan?${params.toString()}` : "/plan",
        reason: "Based on your recent planner context",
        actionLabel: "Open planner",
      });
    }

    const moodAlignedGuide = editorialCollections.find(
      (guide) =>
        !recentGuideActivityIds.has(guide.slug) &&
        ((recentMood && guide.theme?.mood === recentMood) ||
          (dominantAreaSlug &&
            findAreaSlugFromText(guide.theme?.area ?? "") ===
              dominantAreaSlug)),
    );

    if (moodAlignedGuide) {
      suggestions.push({
        id: `guide-${moodAlignedGuide.slug}`,
        title: moodAlignedGuide.title,
        subtitle: moodAlignedGuide.subtitle,
        href: `/guides/${moodAlignedGuide.slug}`,
        reason: "Based on your recent guides and mood context",
        actionLabel: "Open guide",
      });
    }

    if (suggestions.length === 0) {
      return featuredGuides.slice(0, 3).map((guide) => ({
        id: `fallback-${guide.slug}`,
        title: guide.title,
        subtitle: guide.subtitle,
        href: `/guides/${guide.slug}`,
        reason: "Curated city pick",
        actionLabel: "Open guide",
      }));
    }

    return suggestions.slice(0, 4);
  }, [activities, featuredGuides, personalizationContext]);

  const personalizationReasonChips = useMemo(() => {
    const chips: string[] = [];

    if (activities.length > 0) {
      chips.push("Based on your recent exploration");
    }

    if (favoriteSlugSet.size > 0) {
      chips.push("Using your favorites");
    }

    if (collections.length > 0) {
      chips.push("Using your saved lists");
    }

    if (personalizationContext.dominantAreaSlug) {
      const areaName = areaProfiles.find(
        (area) => area.slug === personalizationContext.dominantAreaSlug,
      )?.name;
      if (areaName) {
        chips.push(`Because you viewed ${areaName}`);
      }
    }

    if (personalizationContext.recentMood) {
      chips.push(
        `Good match for ${toMoodLabel(personalizationContext.recentMood).toLowerCase()} evenings`,
      );
    }

    return chips.slice(0, 4);
  }, [
    activities.length,
    collections.length,
    favoriteSlugSet,
    personalizationContext,
  ]);

  const personalizedVenues = useMemo(() => {
    const {
      dominantAreaSlug,
      dominantCategory,
      recentMood,
      recentPlannerStyle,
    } = personalizationContext;
    const recentVenueSlugSet = new Set(
      activities
        .filter((activity) => activity.type === "venue")
        .map((activity) => activity.id),
    );

    const scored = venues
      .map((venue) => {
        let score = 0;

        if (dominantCategory && venue.categorySlug === dominantCategory) {
          score += 4;
        }

        if (
          dominantAreaSlug &&
          findAreaSlugFromText(venue.area) === dominantAreaSlug
        ) {
          score += 3;
        }

        if (
          recentMood &&
          isDiscoveryMood(recentMood) &&
          venueMatchesMood(venue, recentMood)
        ) {
          score += 3;
        }

        if (
          recentPlannerStyle &&
          planStyleBestForHints[recentPlannerStyle]?.length
        ) {
          const bestFor = new Set(venue.bestForTags ?? []);
          if (
            planStyleBestForHints[recentPlannerStyle].some((tag) =>
              bestFor.has(tag),
            )
          ) {
            score += 2;
          }
        }

        if (
          favoriteSlugSet.has(venue.slug) ||
          collectionVenueSlugSet.has(venue.slug)
        ) {
          score += 1;
        }

        if (recentVenueSlugSet.has(venue.slug)) {
          score -= 1;
        }

        return { venue, score };
      })
      .sort((first, second) => {
        if (second.score !== first.score) {
          return second.score - first.score;
        }

        return first.venue.name.localeCompare(second.venue.name);
      });

    const strongMatches = scored
      .filter((entry) => entry.score > 0)
      .slice(0, 3)
      .map((entry) => entry.venue);

    if (strongMatches.length > 0) {
      return strongMatches;
    }

    return featuredVenues.slice(0, 3);
  }, [
    activities,
    collectionVenueSlugSet,
    favoriteSlugSet,
    featuredVenues,
    personalizationContext,
    venues,
  ]);

  const quickFilters = useMemo(
    () =>
      categories
        .filter((category) =>
          [
            "cafes",
            "restaurants",
            "activities",
            "sports",
            "gaming",
            "outdoor",
          ].includes(category.slug),
        )
        .map((category) => ({ value: category.slug, label: category.name })),
    [],
  );

  const buildSearchUrl = (overrides?: {
    category?: string;
    query?: string;
    budget?: string;
  }) => {
    const params = new URLSearchParams();
    const nextQuery = overrides?.query ?? query;
    const nextCategory = overrides?.category ?? selectedCategory;
    const nextBudget = overrides?.budget ?? selectedBudget;

    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim());
    }

    if (nextCategory) {
      params.set("category", nextCategory);
    }

    if (nextBudget !== "all") {
      params.set("budget", nextBudget);
    }

    const suffix = params.toString();
    return suffix ? `/search?${suffix}` : "/search";
  };

  const handleSearchSubmit = () => {
    navigate(buildSearchUrl());
  };

  const handleFilterSelect = (categorySlug: string) => {
    const nextCategory =
      selectedCategory === categorySlug ? undefined : categorySlug;
    setSelectedCategory(nextCategory);
    navigate(buildSearchUrl({ category: nextCategory }));
  };

  const handleRecommendationsClick = () => {
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("q", query.trim());
    }

    if (selectedCategory) {
      params.set("category", selectedCategory);
    }

    if (selectedBudget !== "all") {
      params.set("budget", selectedBudget);
    }

    const suffix = params.toString();
    navigate(suffix ? `/recommendations?${suffix}` : "/recommendations");
  };

  return (
    <div className="bl-home">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-home-main">
        <HomeHero
          texts={dictionary.hero}
          searchValue={query}
          onSearchValueChange={setQuery}
          onSearchSubmit={handleSearchSubmit}
          quickFilters={quickFilters}
          selectedFilter={selectedCategory}
          onFilterSelect={handleFilterSelect}
          budgetValue={selectedBudget}
          onBudgetChange={setSelectedBudget}
          onRecommendationsClick={handleRecommendationsClick}
        />

        <section id="recent" className="bl-home-section">
          <div className="bl-home-section-head">
            <p className="bl-home-eyebrow">For you tonight</p>
            <h2 className="bl-home-section-title">
              Pick up where you left off
            </h2>
            <p className="bl-home-section-subtitle">
              Lightweight, rule-based suggestions from what you explored lately.
            </p>
          </div>

          {personalizationReasonChips.length > 0 ? (
            <div className="bl-home-personal-signals">
              {personalizationReasonChips.map((chip) => (
                <span key={chip} className="bl-home-personal-signal">
                  {chip}
                </span>
              ))}
            </div>
          ) : null}

          <div className="bl-home-personal-grid">
            {personalizedSuggestions.map((suggestion) => (
              <Link
                key={suggestion.id}
                to={suggestion.href}
                className="bl-home-personal-card"
              >
                <p className="bl-home-personal-reason">{suggestion.reason}</p>
                <h3 className="bl-home-personal-title">{suggestion.title}</h3>
                <p className="bl-home-personal-subtitle">
                  {suggestion.subtitle}
                </p>
                <p className="bl-home-personal-action">
                  {suggestion.actionLabel} →
                </p>
              </Link>
            ))}
          </div>

          {personalizedVenues.length > 0 ? (
            <>
              <div className="bl-home-personal-venues-head">
                <h3>Suggested venues for your flow</h3>
                <p>
                  A small set of venue picks from your recent mood, area, and
                  saved context.
                </p>
              </div>

              <div className="bl-home-venues-grid">
                {personalizedVenues.map((venue) => (
                  <VenueCard
                    key={`personal-${venue.slug}`}
                    slug={venue.slug}
                    category={venue.category}
                    name={venue.name}
                    area={venue.area}
                    description={venue.description}
                    personality={{
                      bestForTags: venue.bestForTags,
                      timeOfDay: venue.timeOfDay,
                      energyLevel: venue.energyLevel,
                      socialLevel: venue.socialLevel,
                      spaceType: venue.spaceType,
                    }}
                    whyChips={explainVenueMatch(venue, {
                      mood:
                        personalizationContext.recentMood &&
                        isDiscoveryMood(personalizationContext.recentMood)
                          ? personalizationContext.recentMood
                          : undefined,
                      category: personalizationContext.dominantCategory,
                      area: personalizationContext.dominantAreaSlug,
                    })}
                    href={`/venues/${venue.slug}?from=home`}
                    isFavorite={isFavorite(venue.slug)}
                    onToggleFavorite={toggleFavorite}
                    labels={dictionary.venueCard}
                    showCollectionPicker
                    showCompareToggle
                  />
                ))}
              </div>
            </>
          ) : null}

          {recentPreview.length > 0 ? (
            <>
              <div className="bl-home-recent-grid">
                {recentPreview.map((item) => (
                  <Link
                    key={`${item.type}:${item.id}`}
                    to={item.href}
                    className="bl-home-recent-card"
                  >
                    <p className="bl-home-recent-type">
                      {activityTypeLabel[item.type]}
                    </p>
                    <h3 className="bl-home-recent-title">{item.title}</h3>
                    <p className="bl-home-recent-date">
                      {formatRecentTime(item.timestamp)}
                    </p>
                    <p className="bl-home-recent-action">Continue →</p>
                  </Link>
                ))}
              </div>

              <div className="bl-home-plan-cta">
                <p>Need the full list? Open your recent activity hub.</p>
                <Link to="/recent" className="bl-home-plan-link">
                  Open recently viewed
                </Link>
              </div>
            </>
          ) : (
            <div className="bl-home-plan-cta">
              <p>
                Your recently viewed list will appear here after opening a
                venue, guide, neighborhood, or outing.
              </p>
              <Link to="/search" className="bl-home-plan-link">
                Start exploring
              </Link>
            </div>
          )}
        </section>

        <section id="categories" className="bl-home-section">
          <div className="bl-home-section-head">
            <p className="bl-home-eyebrow">
              {dictionary.home.categoriesEyebrow}
            </p>
            <h2 className="bl-home-section-title">
              {dictionary.home.categoriesTitle}
            </h2>
            <p className="bl-home-section-subtitle">
              {dictionary.home.categoriesSubtitle}
            </p>
          </div>

          <div className="bl-home-categories-grid">
            {categories.map((category) => (
              <Link
                key={category.slug}
                to={`/categories/${category.slug}`}
                className="bl-home-category-card"
              >
                <div className="bl-home-category-title-row">
                  <h3 className="bl-home-category-title">{category.name}</h3>
                  <span className="bl-home-category-arrow">→</span>
                </div>
                <p className="bl-home-category-description">
                  {dictionary.categoryDescriptions[category.slug] ??
                    category.description}
                </p>
                <p className="bl-home-category-action">
                  {dictionary.home.categoriesAction}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section id="venues" className="bl-home-section">
          <div className="bl-home-section-head">
            <p className="bl-home-eyebrow">Mood-first discovery</p>
            <h2 className="bl-home-section-title">
              Start discovery from your mood
            </h2>
            <p className="bl-home-section-subtitle">
              Pick how you want to feel and jump directly into curated matches.
            </p>
          </div>

          <div className="bl-home-mood-grid">
            {moodCards.map((mood) => (
              <Link
                key={mood.slug}
                to={mood.href}
                className="bl-home-mood-card"
              >
                <h3 className="bl-home-mood-title">{mood.title}</h3>
                <p className="bl-home-mood-subtitle">{mood.subtitle}</p>
                <p className="bl-home-mood-action">Start mood discovery →</p>
              </Link>
            ))}
          </div>

          <div className="bl-home-plan-cta">
            <p>
              Create a 2–3 stop evening based on your mood, budget, and company.
            </p>
            <Link to="/plan" className="bl-home-plan-link">
              Plan my outing
            </Link>
          </div>
        </section>

        <section className="bl-home-section">
          <div className="bl-home-section-head">
            <p className="bl-home-eyebrow">Blaniko picks</p>
            <h2 className="bl-home-section-title">
              Curated guides for your next plan
            </h2>
            <p className="bl-home-section-subtitle">
              Editorial collections built by local context, not only filters.
            </p>
          </div>

          <div className="bl-home-editorial-grid">
            {featuredGuides.map((guide) => {
              const matchedCount = resolveEditorialCollectionVenues(
                guide,
                venues,
              ).length;

              return (
                <Link
                  key={guide.slug}
                  to={`/guides/${guide.slug}`}
                  className="bl-home-editorial-card"
                >
                  <p className="bl-home-editorial-kicker">Curated pick</p>
                  <h3 className="bl-home-editorial-title">{guide.title}</h3>
                  <p className="bl-home-editorial-subtitle">{guide.subtitle}</p>

                  {guide.explanationChips?.length ? (
                    <div className="bl-home-editorial-chips">
                      {guide.explanationChips.slice(0, 3).map((chip) => (
                        <span key={`${guide.slug}-${chip}`}>{chip}</span>
                      ))}
                    </div>
                  ) : null}

                  <p className="bl-home-editorial-meta">
                    {matchedCount} venues inside
                  </p>
                  <p className="bl-home-editorial-link">Open guide →</p>
                </Link>
              );
            })}
          </div>

          <div className="bl-home-editorial-cta">
            <p>Explore all city guides curated by Blaniko editors.</p>
            <Link to="/guides">See all curated guides</Link>
          </div>
        </section>

        <section className="bl-home-section">
          <div className="bl-home-section-head">
            <p className="bl-home-eyebrow">Explore by neighborhood</p>
            <h2 className="bl-home-section-title">
              Choose your Casablanca area
            </h2>
            <p className="bl-home-section-subtitle">
              Each neighborhood has its own rhythm. Start where the city mood
              matches your plan.
            </p>
          </div>

          <div className="bl-home-area-grid">
            {areaProfiles.map((area) => (
              <Link
                key={area.slug}
                to={`/areas/${area.slug}`}
                className="bl-home-area-card"
              >
                <div className="bl-home-area-title-row">
                  <h3 className="bl-home-area-title">{area.name}</h3>
                  <span className="bl-home-area-arrow">→</span>
                </div>
                <p className="bl-home-area-personality">{area.personality}</p>
                <p className="bl-home-area-summary">{area.vibeSummary}</p>
                <p className="bl-home-area-action">Explore {area.name}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="bl-home-section">
          <div className="bl-home-section-head">
            <p className="bl-home-eyebrow">{dictionary.home.featuredEyebrow}</p>
            <h2 className="bl-home-section-title">
              {dictionary.home.featuredTitle}
            </h2>
            <p className="bl-home-section-subtitle">
              {dictionary.home.featuredSubtitle}
            </p>
          </div>

          <div className="bl-home-venues-grid">
            {featuredVenues.map((venue) => (
              <VenueCard
                key={venue.slug}
                slug={venue.slug}
                category={venue.category}
                name={venue.name}
                area={venue.area}
                description={venue.description}
                personality={{
                  bestForTags: venue.bestForTags,
                  timeOfDay: venue.timeOfDay,
                  energyLevel: venue.energyLevel,
                  socialLevel: venue.socialLevel,
                  spaceType: venue.spaceType,
                }}
                whyChips={explainVenueMatch(venue, {})}
                href={`/venues/${venue.slug}?from=home`}
                isFeatured
                isFavorite={isFavorite(venue.slug)}
                onToggleFavorite={toggleFavorite}
                labels={dictionary.venueCard}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="bl-home-footer">
        <div className="bl-home-footer-inner">
          <p>© {new Date().getFullYear()} Blaniko</p>
          <p>{dictionary.home.footerText}</p>
        </div>
      </footer>
    </div>
  );
}
