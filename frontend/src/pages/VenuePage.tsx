import { useEffect, useMemo } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router";
import { CollectionPicker } from "../components/collections/CollectionPicker";
import { CompareToggle } from "../components/compare/CompareToggle";
import { HomeHeader } from "../components/home/HomeHeader";
import { useFavorites } from "../hooks/useFavorites";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
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
  const { dictionary } = useI18n();
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
        ? "Back to neighborhood"
        : from === "favorites"
          ? dictionary.venuePage.backToFavorites
          : from === "collections"
            ? "Back to collections"
            : from === "compare"
              ? "Back to compare"
              : from === "guides"
                ? "Back to guides"
                : from === "venue" && isValidSourceVenueSlug
                  ? "Back to previous venue"
                  : from === "map"
                    ? dictionary.venuePage.backToMap
                    : from === "search"
                      ? "Back to search results"
                      : from === "recommendations"
                        ? "Back to recommendations"
                        : from === "plan"
                          ? "Back to planner"
                          : dictionary.venuePage.backToHome;

  const venue = slug ? getVenueBySlug(slug) : undefined;
  const similarVenues = useMemo(
    () => (venue ? rankVenueAlternatives(venue, venues, 4) : []),
    [venue, venues],
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
        </main>
      </div>
    );
  }

  const shortDescription = venue.shortDescription ?? venue.description;
  const overview =
    venue.overview ??
    dictionary.venuePage.fallbackOverview
      .replace("{name}", venue.name)
      .replace("{category}", venue.category.toLowerCase())
      .replace("{area}", venue.area);
  const vibe = venue.vibe ?? dictionary.venuePage.fallbackVibe;
  const audience = venue.audience ?? dictionary.venuePage.fallbackAudience;
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
  );
  const personality = getVenuePersonalitySection(venue);

  return (
    <div className="bl-venue-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-venue-main">
        <section className="bl-venue-hero">
          <div className="bl-venue-hero-glow-right" />
          <div className="bl-venue-hero-glow-left" />

          <div className="bl-venue-hero-grid">
            <div>
              <Link to={backHref} className="bl-venue-back-link">
                ← {backLabel}
              </Link>

              <p className="bl-venue-category-pill">{venue.category}</p>

              <h1 className="bl-venue-title">{venue.name}</h1>

              <p className="bl-venue-area-line">
                {dictionary.venuePage.area}: <span>{venue.area}</span>
              </p>

              <p className="bl-venue-short-description">{shortDescription}</p>

              <div className="bl-venue-why-card">
                <p className="bl-venue-why-title">Why this place?</p>
                <div className="bl-venue-why-list">
                  {whyThisPlace.map((reason) => (
                    <span key={reason} className="bl-venue-why-chip">
                      {reason}
                    </span>
                  ))}
                </div>
              </div>

              {personality.bestFor.length > 0 ? (
                <div className="bl-venue-why-card">
                  <p className="bl-venue-why-title">Best for</p>
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

              <CollectionPicker venueSlug={venue.slug} />
              <CompareToggle venueSlug={venue.slug} />

              <p>
                <Link to="/collections" className="bl-venue-back-link">
                  Open collections
                </Link>
              </p>
            </div>

            <div className="bl-venue-side-panel">
              <div className="bl-venue-side-panel-image" />
              <p className="bl-venue-side-panel-eyebrow">
                {dictionary.venuePage.panelEyebrow}
              </p>
              <p className="bl-venue-side-panel-subtitle">
                {dictionary.venuePage.panelSubtitle}
              </p>
            </div>
          </div>
        </section>

        <section className="bl-venue-content-grid">
          <div className="bl-venue-overview-card">
            <h2 className="bl-venue-overview-title">
              {dictionary.venuePage.overview}
            </h2>
            <p className="bl-venue-overview-text">{overview}</p>
          </div>

          <div className="bl-venue-overview-card bl-venue-personality-card">
            <h2 className="bl-venue-overview-title">Venue personality</h2>
            <p className="bl-venue-overview-text bl-venue-personality-summary">
              {personality.whyPeopleChoose}
            </p>

            {personality.bestTimeToGo.length > 0 ? (
              <div className="bl-venue-why-card">
                <p className="bl-venue-why-title">Best time to go</p>
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
                <p className="bl-venue-why-title">Atmosphere</p>
                <p className="bl-venue-personality-atmosphere">
                  {personality.atmosphere}
                </p>
              </div>
            ) : null}
          </div>

          <div className="bl-venue-meta-grid">
            <div className="bl-venue-meta-card">
              <p className="bl-venue-meta-label">{dictionary.venuePage.vibe}</p>
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

        {similarVenues.length > 0 ? (
          <section className="bl-venue-similar-section">
            <div className="bl-venue-similar-head">
              <h2 className="bl-venue-overview-title">Similar places nearby</h2>
              <p>
                Alternatives based on area, category, vibe, and personality fit.
              </p>
            </div>

            <div className="bl-venue-similar-grid">
              {similarVenues.map(({ venue: alternative, reasons }) => (
                <article
                  key={alternative.slug}
                  className="bl-venue-similar-card"
                >
                  <p className="bl-venue-similar-category">
                    {alternative.category}
                  </p>
                  <h3 className="bl-venue-similar-name">{alternative.name}</h3>
                  <p className="bl-venue-similar-area">📍 {alternative.area}</p>
                  <p className="bl-venue-similar-description">
                    {alternative.shortDescription ?? alternative.description}
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
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
