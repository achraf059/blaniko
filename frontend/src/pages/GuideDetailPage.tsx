import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import {
  getEditorialCollectionBySlug,
  resolveEditorialCollectionVenues,
} from "../data/editorialCollections";
import { useVenues } from "../hooks/useVenues";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { useI18n } from "../i18n/useI18n";
import {
  getBestForBadges,
  getVenuePersonalitySignals,
} from "../utils/venuePersonality";
import "./HomePage.css";
import "./GuidesPage.css";

export default function GuideDetailPage() {
  const { dictionary } = useI18n();
  const { slug } = useParams();
  const location = useLocation();
  const { venues } = useVenues();
  const { trackActivity } = useRecentActivity();

  const collection = getEditorialCollectionBySlug(slug);

  useEffect(() => {
    if (!collection) {
      return;
    }

    trackActivity({
      id: collection.slug,
      type: "guide",
      title: collection.title,
      href: `${location.pathname}${location.search}`,
    });
  }, [collection, location.pathname, location.search, trackActivity]);

  if (!collection) {
    return (
      <div className="bl-guides-page">
        <HomeHeader labels={dictionary.header} />

        <main className="bl-guides-main">
          <section className="bl-guides-empty-state">
            <p className="bl-guides-eyebrow">Guide not found</p>
            <h1>This guide is not available.</h1>
            <p>It may have been removed or renamed.</p>
            <div className="bl-guides-empty-links">
              <Link to="/guides">Back to guides</Link>
              <Link to="/search">Explore venues</Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const matchedVenues = resolveEditorialCollectionVenues(collection, venues);

  return (
    <div className="bl-guides-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-guides-main">
        <section className="bl-guide-detail-hero">
          <Link to="/guides" className="bl-guide-detail-back-link">
            ← Back to all guides
          </Link>

          <p className="bl-guides-eyebrow">Curated by Blaniko</p>
          <h1>{collection.title}</h1>
          <p className="bl-guide-detail-subtitle">{collection.subtitle}</p>
          <p className="bl-guide-detail-description">
            {collection.description}
          </p>

          <div className="bl-guide-detail-theme-row">
            {collection.theme?.mood ? (
              <span>Mood: {collection.theme.mood}</span>
            ) : null}
            {collection.theme?.area ? (
              <span>Area: {collection.theme.area}</span>
            ) : null}
            {collection.theme?.budget ? (
              <span>Budget: {collection.theme.budget}</span>
            ) : null}
          </div>
        </section>

        <section className="bl-guide-detail-why">
          <h2>Why this collection matters</h2>
          <p>{collection.whyItMatters}</p>
          {collection.explanationChips?.length ? (
            <div className="bl-guides-card-chips">
              {collection.explanationChips.map((chip) => (
                <span key={`${collection.slug}-detail-${chip}`}>{chip}</span>
              ))}
            </div>
          ) : null}
        </section>

        <section className="bl-guide-detail-venues">
          <div className="bl-guide-detail-section-head">
            <h2>Matching venues</h2>
            <p>{matchedVenues.length} venues selected for this guide</p>
          </div>

          {matchedVenues.length === 0 ? (
            <div className="bl-guides-empty-state">
              <h3>No venues available right now.</h3>
              <p>Try browsing search while we refresh this guide.</p>
              <Link to="/search">Open search</Link>
            </div>
          ) : (
            <div className="bl-guide-detail-venue-grid">
              {matchedVenues.map((venue) => (
                <article
                  key={venue.slug}
                  className="bl-guide-detail-venue-card"
                >
                  {(() => {
                    const badges = getBestForBadges(venue, 2);
                    const signals = getVenuePersonalitySignals(venue).slice(
                      0,
                      2,
                    );

                    return (
                      <>
                        <p className="bl-guide-detail-venue-category">
                          {venue.category}
                        </p>
                        <h3>{venue.name}</h3>
                        <p className="bl-guide-detail-venue-area">
                          📍 {venue.area}
                        </p>
                        <p className="bl-guide-detail-venue-description">
                          {venue.shortDescription ?? venue.description}
                        </p>

                        {badges.length > 0 ? (
                          <div className="bl-guide-detail-venue-badges">
                            {badges.map((badge, index) => (
                              <span
                                key={`${venue.slug}-badge-${badge}-${index}`}
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {signals.length > 0 ? (
                          <p className="bl-guide-detail-venue-signals">
                            {signals.join(" • ")}
                          </p>
                        ) : null}
                        <Link to={`/venues/${venue.slug}?from=guides`}>
                          {dictionary.venueCard.viewDetails} →
                        </Link>
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="bl-guide-detail-cta-row">
          <Link to="/map">View on map</Link>
          <Link to="/plan">Plan an outing</Link>
          {collection.cta ? (
            <Link to={collection.cta.href}>{collection.cta.label}</Link>
          ) : null}
        </section>
      </main>
    </div>
  );
}
