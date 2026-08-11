import { useEffect, useMemo } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router";
import { CollectionPicker } from "../components/collections/CollectionPicker";
import { CompareToggle } from "../components/compare/CompareToggle";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueCard } from "../components/home/VenueCard";
import { VenueImage } from "../components/home/VenueImage";
import { getVenueDisplay } from "../data/mockData";
import { useFavorites } from "../hooks/useFavorites";
import { usePageMeta } from "../hooks/usePageMeta";
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
import { getVenueImageSrc } from "../utils/venueImage";
import { safeExternalUrl } from "../utils/externalUrl";
import PublicFooter from "../components/PublicFooter";
import "./VenuePage.css";

export default function VenuePage() {
  const { slug } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { dictionary, language } = useI18n();
  const text = getFlowTexts(language);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { trackActivity } = useRecentActivity();
  const { venues, getVenueBySlug, isLoading } = useVenues();

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
                      ? withContext("/categories")
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
  usePageMeta(
    venue ? `${venue.name} — ${venue.area} | Blaniko` : "Venue | Blaniko",
    venue?.shortDescription ?? venue?.description,
  );
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

  if (isLoading) {
    return (
      <div className="bl-venue-page">
        <HomeHeader labels={dictionary.header} />
        <main className="bl-venue-main">
          <div className="bl-venue-content">
            <section className="bl-venue-not-found">
              <p style={{ opacity: 0.5 }}>{dictionary.venuePage.loading}</p>
            </section>
          </div>
        </main>
      </div>
    );
  }

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
  const priceLevel = venue.priceLevel ?? null;
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
            src={getVenueImageSrc(venue)}
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
          <div className="bl-venue-hero-title-overlay">
            <p className="bl-venue-category-pill">{categoryName}</p>
            <h1 className="bl-venue-title">{venue.name}</h1>
            <div className="bl-venue-title-meta">
              <span className="bl-venue-area-badge">
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>
                {venue.area}
              </span>
              {venue.priceLevel ? (
                <span className="bl-venue-price-badge">{priceLevel}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="bl-venue-content">
          <p className="bl-venue-short-description">{shortDescription}</p>

          {/* Trust / verification indicator */}
          <div className="bl-venue-trust-badge" data-status={venue.verificationStatus ?? "collected"}>
            <span className="bl-venue-trust-icon" aria-hidden="true">
              {venue.verificationStatus === "verified" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 16.77l-6.18 3.25L7 13.14 2 8.27l6.91-1.01L12 1z"/></svg>
              ) : venue.verificationStatus === "confirmed" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              )}
            </span>
            <span className="bl-venue-trust-text">
              <span className="bl-venue-trust-label">
                {venue.verificationStatus === "verified"
                  ? dictionary.venuePage.trustVerified
                  : venue.verificationStatus === "confirmed"
                    ? dictionary.venuePage.trustConfirmed
                    : dictionary.venuePage.trustCollected}
              </span>
              {(!venue.verificationStatus || venue.verificationStatus === "collected") && (
                <span className="bl-venue-trust-sub">
                  {dictionary.venuePage.trustCollectedSub}
                </span>
              )}
              {venue.lastUpdated && (
                <span className="bl-venue-trust-date">
                  {dictionary.venuePage.trustLastUpdated}: {new Date(venue.lastUpdated).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", { month: "short", year: "numeric" })}
                </span>
              )}
            </span>
          </div>

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
                <div className="bl-venue-fact-strip">
                  <div className="bl-venue-fact-item">
                    <span className="bl-venue-fact-label">{dictionary.venuePage.area}</span>
                    <span className="bl-venue-fact-value">{venue.area.split(",")[0]?.trim() ?? venue.area}</span>
                  </div>
                  <div className="bl-venue-fact-item">
                    <span className="bl-venue-fact-label">{dictionary.venuePage.vibe}</span>
                    <span className="bl-venue-fact-value">{vibe}</span>
                  </div>
                  <div className="bl-venue-fact-item">
                    <span className="bl-venue-fact-label">{dictionary.venuePage.audience}</span>
                    <span className="bl-venue-fact-value">{audience}</span>
                  </div>
                  {priceLevel ? (
                    <div className="bl-venue-fact-item">
                      <span className="bl-venue-fact-label">{dictionary.venuePage.priceLevel}</span>
                      <span className="bl-venue-fact-value">{priceLevel}</span>
                    </div>
                  ) : null}
                </div>
              </section>

              {/* Location link */}
              {venue.googleMapsLink ? (
                <section className="bl-venue-body-section">
                  <h2 className="bl-venue-section-title">
                    {dictionary.venuePage.panelEyebrow}
                  </h2>
                  <a
                    href={venue.googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bl-venue-maps-link"
                  >
                    <svg className="bl-venue-maps-link-icon" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>
                    <span className="bl-venue-maps-link-text">
                      <span className="bl-venue-maps-link-name">{venue.area.split(",")[0]?.trim() ?? venue.area}</span>
                      <span className="bl-venue-maps-link-sub">{dictionary.venuePage.panelSubtitle}</span>
                    </span>
                    <span className="bl-venue-maps-link-arrow" aria-hidden="true">→</span>
                  </a>
                </section>
              ) : null}
            </div>

            {/* Sticky action sidebar */}
            <aside className="bl-venue-sidebar">
              <div className="bl-venue-action-card">
                {/* Primary CTA block — contact / directions */}
                {(() => {
                  const hasMap = Boolean(venue.googleMapsLink);
                  const hasPhone = Boolean(venue.phone);
                  // Normalize outbound links at render time (see safeExternalUrl).
                  // The stored venue values are never mutated.
                  const safeWebsite = safeExternalUrl(venue.website);
                  const safeInstagram = safeExternalUrl(venue.instagram);
                  const hasWebsite = Boolean(safeWebsite);
                  const hasInstagram = Boolean(safeInstagram);
                  const hasAnyContact = hasMap || hasPhone || hasWebsite || hasInstagram;

                  // Sanitize phone: digits + leading +
                  const rawPhone = venue.phone ?? "";
                  const dialPhone = rawPhone.replace(/[^\d+]/g, "");
                  // WhatsApp: digits only, drop leading +
                  const waPhone = dialPhone.replace(/^\+/, "");

                  return (
                    <div className="bl-venue-cta-block">
                      {hasMap ? (
                        <a
                          href={venue.googleMapsLink!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bl-venue-cta-primary"
                        >
                          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>
                          {dictionary.venuePage.actionOpenMaps}
                        </a>
                      ) : null}

                      {(hasPhone || hasWebsite || hasInstagram) ? (
                        <div className="bl-venue-cta-pills">
                          {hasPhone ? (
                            <a
                              href={`tel:${dialPhone}`}
                              className="bl-venue-cta-pill"
                            >
                              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L11 11.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.9.6 2.9.7A2 2 0 0 1 22 16.9Z"/></svg>
                              {dictionary.venuePage.actionCall}
                            </a>
                          ) : null}
                          {hasPhone ? (
                            <a
                              href={`https://wa.me/${waPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bl-venue-cta-pill"
                            >
                              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                              {dictionary.venuePage.actionWhatsApp}
                            </a>
                          ) : null}
                          {hasWebsite ? (
                            <a
                              href={safeWebsite!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bl-venue-cta-pill"
                            >
                              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                              {dictionary.venuePage.actionWebsite}
                            </a>
                          ) : null}
                          {hasInstagram ? (
                            <a
                              href={safeInstagram!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bl-venue-cta-pill"
                            >
                              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                              {dictionary.venuePage.actionInstagram}
                            </a>
                          ) : null}
                        </div>
                      ) : null}

                      {!hasAnyContact ? (
                        <p className="bl-venue-cta-soon">
                          {dictionary.venuePage.actionContactSoon}
                        </p>
                      ) : null}
                    </div>
                  );
                })()}

                <div className="bl-venue-action-divider" />

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
                  {priceLevel ? (
                    <div className="bl-venue-action-meta-row">
                      <span className="bl-venue-action-meta-label">
                        {dictionary.venuePage.priceLevel}
                      </span>
                      <span className="bl-venue-action-meta-value">{priceLevel}</span>
                    </div>
                  ) : null}
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

                <div className="bl-venue-owner-cta">
                  <Link
                    to={`/partners?venue=${venue.slug}&name=${encodeURIComponent(venue.name)}`}
                    className="bl-venue-owner-cta-link"
                  >
                    {text.venuePage.ownerCta}
                  </Link>
                </div>
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
              {similarVenues.map(({ venue: alternative }) => {
                const adv = getVenueDisplay(alternative, language);
                const altCategoryName =
                  dictionary.categoryNames[alternative.categorySlug] ??
                  dictionary.venuePage.unknownCategory;
                return (
                  <VenueCard
                    key={alternative.slug}
                    slug={alternative.slug}
                    category={altCategoryName}
                    name={alternative.name}
                    area={alternative.area}
                    description={adv.shortDescription ?? adv.description}
                    imageUrl={getVenueImageSrc(alternative)}
                    priceLevel={alternative.priceLevel}
                    personality={{
                      bestForTags: alternative.bestForTags,
                      timeOfDay: alternative.timeOfDay,
                      energyLevel: alternative.energyLevel,
                      socialLevel: alternative.socialLevel,
                      spaceType: alternative.spaceType,
                    }}
                    href={`/venues/${alternative.slug}?from=venue&source=${venue.slug}`}
                    isFavorite={isFavorite(alternative.slug)}
                    onToggleFavorite={toggleFavorite}
                    language={language}
                    labels={dictionary.venueCard}
                  />
                );
              })}
            </div>
          </section>
        ) : null}
      </main>

      <PublicFooter />
    </div>
  );
}
