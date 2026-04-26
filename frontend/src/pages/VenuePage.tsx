import { useEffect, useMemo } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router";
import { CollectionPicker } from "../components/collections/CollectionPicker";
import { CompareToggle } from "../components/compare/CompareToggle";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueImage } from "../components/home/VenueImage";
import { getVenueDisplay } from "../data/mockData";
import { useFavorites } from "../hooks/useFavorites";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import { getFlowTexts } from "../i18n/flowTexts";
import {
  explainVenueMatch,
  isDiscoveryCompanion,
  isDiscoveryMood,
} from "../utils/discoveryInsights";
import { rankVenueAlternatives } from "../utils/venueAlternatives";
import { getVenuePersonalitySection } from "../utils/venuePersonality";
import "./VenuePage.css";

export default function VenuePage() {
  const { slug } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { dictionary, language } = useI18n();
  const text = getFlowTexts(language);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { trackActivity } = useRecentActivity();
  const { venues, getVenueBySlug } = useVenues();

  const from = searchParams.get("from");
  const categoryFromQuery = searchParams.get("category");
  const areaSlugFromQuery = searchParams.get("area");
  const sourceVenueFromQuery = searchParams.get("source");
  const queryFromSearch = searchParams.get("q") ?? undefined;
  const budgetFromSearch = searchParams.get("budget") ?? undefined;
  const areaFromSearch = searchParams.get("area") ?? undefined;
  const moodParam = searchParams.get("mood") ?? "";
  const withParam = searchParams.get("with") ?? "";
  const moodFromSearch = isDiscoveryMood(moodParam) ? moodParam : undefined;
  const companionFromSearch = isDiscoveryCompanion(withParam)
    ? withParam
    : undefined;

  const isValidSlug =
    typeof categoryFromQuery === "string" &&
    /^[a-z0-9-]+$/.test(categoryFromQuery);
  const isValidAreaSlug =
    typeof areaSlugFromQuery === "string" &&
    /^[a-z0-9-]+$/.test(areaSlugFromQuery);
  const isValidSourceVenueSlug =
    typeof sourceVenueFromQuery === "string" &&
    /^[a-z0-9-]+$/.test(sourceVenueFromQuery);

  const contextParams = new URLSearchParams(searchParams);
  contextParams.delete("from");
  const contextSuffix = contextParams.toString();
  const withContext = (path: string) =>
    contextSuffix.length > 0 ? `${path}?${contextSuffix}` : path;

  const backHref =
    from === "category" && isValidSlug
      ? `/categories/${categoryFromQuery}`
      : from === "area" && isValidAreaSlug
        ? `/areas/${areaSlugFromQuery}`
        : from === "favorites"
          ? "/favorites"
          : from === "collections"
            ? "/collections"
            : from === "compare"
              ? "/compare"
              : from === "guides"
                ? "/guides"
                : from === "venue" && isValidSourceVenueSlug
                  ? `/venues/${sourceVenueFromQuery}?from=venue`
                  : from === "map"
                    ? withContext("/map")
                    : from === "search"
                      ? withContext("/search")
                      : from === "recommendations"
                        ? withContext("/recommendations")
                        : from === "plan"
                          ? withContext("/plan")
                          : "/";

  const backLabel =
    from === "category" && isValidSlug
      ? dictionary.venuePage.backToCategory
      : from === "area" && isValidAreaSlug
        ? text.venuePage.backNeighborhood
        : from === "favorites"
          ? dictionary.venuePage.backToFavorites
          : from === "collections"
            ? text.venuePage.backCollections
            : from === "compare"
              ? text.venuePage.backCompare
              : from === "guides"
                ? text.venuePage.backGuides
                : from === "venue" && isValidSourceVenueSlug
                  ? text.venuePage.backPreviousVenue
                  : from === "map"
                    ? dictionary.venuePage.backToMap
                    : from === "search"
                      ? text.venuePage.backSearchResults
                      : from === "recommendations"
                        ? text.venuePage.backRecommendations
                        : from === "plan"
                          ? text.venuePage.backPlanner
                          : dictionary.venuePage.backToHome;

  const venue = slug ? getVenueBySlug(slug) : undefined;
  const similarVenues = useMemo(
    () =>
      venue ? rankVenueAlternatives(venue, venues, 4, language) : [],
    [venue, venues, language],
  );

  useEffect(() => {
    if (!venue) {
      return;
    }

    trackActivity({
      id: venue.slug,
      type: "venue",
      title: venue.name,
      href: `${location.pathname}${location.search}`,
    });
  }, [location.pathname, location.search, trackActivity, venue]);

  if (!venue) {
    return (
      <div className="bl-venue-page">
        <HomeHeader labels={dictionary.header} />

        <main className="bl-venue-main">
          <div className="bl-venue-content">
            <section className="bl-venue-not-found">
              <Link to={backHref} className="bl-venue-back-link">
                ← {backLabel}
              </Link>

              <h1 className="bl-venue-not-found-title">
                {dictionary.venuePage.notFoundTitle}
              </h1>

              <p className="bl-venue-not-found-description">
                {dictionary.venuePage.notFoundDescription}
              </p>
            </section>
          </div>
        </main>
      </div>
    );
  }

  const vd = getVenueDisplay(venue, language);
  const categoryName =
    dictionary.categoryNames[venue.categorySlug] ?? dictionary.venuePage.unknownCategory;
  const shortDescription = vd.shortDescription ?? vd.description;
  const overview =
    vd.overview ??
    dictionary.venuePage.fallbackOverview
      .replace("{name}", venue.name)
      .replace("{category}", categoryName.toLowerCase())
      .replace("{area}", venue.area);
  const vibe = vd.vibe ?? dictionary.venuePage.fallbackVibe;
  const audience = vd.audience ?? dictionary.venuePage.fallbackAudience;
  const priceLevel =
    venue.priceLevel ?? dictionary.venuePage.fallbackPriceLevel;
  const isVenueFavorite = isFavorite(venue.slug);
  const whyThisPlace = explainVenueMatch(
    venue,
    {
      query: queryFromSearch,
      category: searchParams.get("category") ?? undefined,
      budget: budgetFromSearch,
      mood: moodFromSearch,
      companion: companionFromSearch,
      area: areaFromSearch,
    },
    4,
    language,
  );
  const personality = getVenuePersonalitySection(vd, language);

  return (
    <div className="bl-venue-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-venue-main">
        {/* Full-bleed hero image */}
        <div className="bl-venue-hero-wrap">
          <VenueImage
            category={categoryName}
            categorySlug={venue.categorySlug}
            alt={venue.name}
            aspectRatio="auto"
            className="bl-venue-hero-image"
          />
          <div className="bl-venue-hero-overlay">
            <Link to={backHref} className="bl-venue-back-link bl-venue-back-link-hero">
              ← {backLabel}
            </Link>
          </div>
        </div>

        <div className="bl-venue-content">
          {/* Editorial title area */}
          <header className="bl-venue-title-area">
            <p className="bl-venue-category-pill">{categoryName}</p>
            <h1 className="bl-venue-title">{venue.name}</h1>
            <div className="bl-venue-title-meta">
              <span className="bl-venue-area-badge">
                <span aria-hidden="true">📍</span>
                {venue.area}
              </span>
              {venue.priceLevel ? (
                <span className="bl-venue-price-badge">{priceLevel}</span>
              ) : null}
            </div>
            <p className="bl-venue-short-description">{shortDescription}</p>
          </header>

          {/* Contextual why-chips (only shown when navigated from search/plan) */}
          {whyThisPlace.length > 0 ? (
            <div className="bl-venue-context-chips">
              <p className="bl-venue-why-title">{text.venuePage.whyThisPlace}</p>
              <div className="bl-venue-why-list">
                {whyThisPlace.map((reason) => (
                  <span key={reason} className="bl-venue-why-chip">
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Two-column body */}
          <div className="bl-venue-body-grid">
            {/* Main content column */}
            <div className="bl-venue-body-main">
              {/* Overview */}
              <section className="bl-venue-body-section">
                <h2 className="bl-venue-section-title">
                  {dictionary.venuePage.overview}
                </h2>
                <p className="bl-venue-overview-text">{overview}</p>
              </section>

              {/* Personality */}
              <section className="bl-venue-body-section">
                <h2 className="bl-venue-section-title">
                  {text.venuePage.personalityTitle}
                </h2>
                <p className="bl-venue-overview-text">
                  {personality.whyPeopleChoose}
                </p>

                {personality.bestFor.length > 0 ? (
                  <div className="bl-venue-why-card">
                    <p className="bl-venue-why-title">
                      {text.venuePage.bestFor}
                    </p>
                    <div className="bl-venue-why-list">
                      {personality.bestFor.map((tag, index) => (
                        <span
                          key={`${venue.slug}-best-for-${tag}-${index}`}
                          className="bl-venue-why-chip"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {personality.bestTimeToGo.length > 0 ? (
                  <div className="bl-venue-why-card">
                    <p className="bl-venue-why-title">
                      {text.venuePage.bestTimeToGo}
                    </p>
                    <div className="bl-venue-why-list">
                      {personality.bestTimeToGo.map((time, index) => (
                        <span
                          key={`${venue.slug}-time-${time}-${index}`}
                          className="bl-venue-why-chip"
                        >
                          {time}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {personality.atmosphere ? (
                  <div className="bl-venue-why-card">
                    <p className="bl-venue-why-title">
                      {text.venuePage.atmosphere}
                    </p>
                    <p className="bl-venue-personality-atmosphere">
                      {personality.atmosphere}
                    </p>
                  </div>
                ) : null}
              </section>

              {/* Practical info */}
              <section className="bl-venue-body-section">
                <div className="bl-venue-meta-grid">
                  <div className="bl-venue-meta-card">
                    <p className="bl-venue-meta-label">
                      {dictionary.venuePage.area}
                    </p>
                    <p className="bl-venue-meta-value">{venue.area}</p>
                  </div>

                  <div className="bl-venue-meta-card">
                    <p className="bl-venue-meta-label">
                      {dictionary.venuePage.vibe}
                    </p>
                    <p className="bl-venue-meta-value">{vibe}</p>
                  </div>

                  <div className="bl-venue-meta-card">
                    <p className="bl-venue-meta-label">
                      {dictionary.venuePage.audience}
                    </p>
                    <p className="bl-venue-meta-value">{audience}</p>
                  </div>

                  <div className="bl-venue-meta-card">
                    <p className="bl-venue-meta-label">
                      {dictionary.venuePage.priceLevel}
                    </p>
                    <p className="bl-venue-meta-value">{priceLevel}</p>
                  </div>
                </div>
              </section>

              {/* Area / map placeholder */}
              <section className="bl-venue-body-section bl-venue-map-section">
                <h2 className="bl-venue-section-title">
                  {dictionary.venuePage.panelEyebrow}
                </h2>
                <div className="bl-venue-map-panel" aria-hidden="true">
                  <div className="bl-venue-map-pin-wrap">
                    <div className="bl-venue-map-pin">
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="bl-venue-map-pin-icon"
                        aria-hidden="true"
                      >
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                    </div>
                    <span className="bl-venue-map-area-tag">{venue.area}</span>
                  </div>
                </div>
                <p className="bl-venue-map-caption">
                  {dictionary.venuePage.panelSubtitle}
                </p>
              </section>
            </div>

            {/* Sticky action sidebar */}
            <aside className="bl-venue-sidebar">
              <div className="bl-venue-action-card">
                <button
                  type="button"
                  className={`bl-venue-favorite-btn${isVenueFavorite ? " is-active" : ""}`}
                  onClick={() => toggleFavorite(venue.slug)}
                  aria-pressed={isVenueFavorite}
                >
                  <span aria-hidden="true">{isVenueFavorite ? "♥" : "♡"}</span>
                  <span>
                    {isVenueFavorite
                      ? dictionary.venuePage.removeFavorite
                      : dictionary.venuePage.saveFavorite}
                  </span>
                </button>

                <div className="bl-venue-action-divider" />

                <CollectionPicker venueSlug={venue.slug} />
                <CompareToggle venueSlug={venue.slug} />

                <div className="bl-venue-action-divider" />

                <div className="bl-venue-action-meta">
                  <div className="bl-venue-action-meta-row">
                    <span className="bl-venue-action-meta-label">
                      {dictionary.venuePage.priceLevel}
                    </span>
                    <span className="bl-venue-action-meta-value">{priceLevel}</span>
                  </div>
                  <div className="bl-venue-action-meta-row">
                    <span className="bl-venue-action-meta-label">
                      {dictionary.venuePage.vibe}
                    </span>
                    <span className="bl-venue-action-meta-value">{vibe}</span>
                  </div>
                  <div className="bl-venue-action-meta-row">
                    <span className="bl-venue-action-meta-label">
                      {dictionary.venuePage.audience}
                    </span>
                    <span className="bl-venue-action-meta-value">{audience}</span>
                  </div>
                </div>

                <Link to="/collections" className="bl-venue-collections-link">
                  {text.common.openCollections}
                </Link>
              </div>
            </aside>
          </div>
        </div>

        {/* Similar venues horizontal carousel */}
        {similarVenues.length > 0 ? (
          <section className="bl-venue-similar-section">
            <div className="bl-venue-similar-head">
              <h2 className="bl-venue-section-title">
                {text.venuePage.similarPlaces}
              </h2>
              <p className="bl-venue-similar-description">
                {text.venuePage.similarDescription}
              </p>
            </div>

            <div className="bl-venue-similar-carousel">
              {similarVenues.map(({ venue: alternative, reasons }) => {
                const adv = getVenueDisplay(alternative, language);
                const altCategoryName =
                  dictionary.categoryNames[alternative.categorySlug] ??
                  dictionary.venuePage.unknownCategory;
                return (
                  <article
                    key={alternative.slug}
                    className="bl-venue-similar-card"
                  >
                    {/* Compact image placeholder — category shown via VenueImage label */}
                    <VenueImage
                      category={altCategoryName}
                      categorySlug={alternative.categorySlug}
                      alt={alternative.name}
                      aspectRatio="auto"
                      className="bl-venue-similar-image"
                    />

                    <div className="bl-venue-similar-body">
                      <h3 className="bl-venue-similar-name">
                        {alternative.name}
                      </h3>
                      <p className="bl-venue-similar-area">
                        <span aria-hidden="true">📍</span>
                        {alternative.area}
                      </p>
                      <p className="bl-venue-similar-desc">
                        {adv.shortDescription ?? adv.description}
                      </p>

                      {reasons.length > 0 ? (
                        <div className="bl-venue-similar-reasons">
                          {reasons.slice(0, 3).map((reason) => (
                            <span key={`${alternative.slug}-${reason}`}>
                              {reason}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="bl-venue-similar-actions">
                        <button
                          type="button"
                          className={`bl-venue-favorite-btn${
                            isFavorite(alternative.slug) ? " is-active" : ""
                          }`}
                          onClick={() => toggleFavorite(alternative.slug)}
                        >
                          {isFavorite(alternative.slug)
                            ? dictionary.venuePage.removeFavorite
                            : dictionary.venuePage.saveFavorite}
                        </button>

                        <Link
                          to={`/venues/${alternative.slug}?from=venue&source=${venue.slug}`}
                          className="bl-venue-back-link"
                        >
                          {dictionary.venueCard.viewDetails} →
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
