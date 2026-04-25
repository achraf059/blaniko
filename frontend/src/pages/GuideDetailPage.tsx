import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import {
  getCollectionDisplay,
  getEditorialCollectionBySlug,
  resolveEditorialCollectionVenues,
} from "../data/editorialCollections";
import { getVenueDisplay } from "../data/mockData";
import { useVenues } from "../hooks/useVenues";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { useI18n } from "../i18n/useI18n";
import { formatFlowText, getFlowTexts } from "../i18n/flowTexts";
import {
  getBestForBadges,
  getVenuePersonalitySignals,
} from "../utils/venuePersonality";
import "./HomePage.css";
import "./GuidesPage.css";

export default function GuideDetailPage() {
  const { dictionary, language } = useI18n();
  const text = getFlowTexts(language);
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
            <p className="bl-guides-eyebrow">
              {text.guideDetailPage.notFoundEyebrow}
            </p>
            <h1>{text.guideDetailPage.notFoundTitle}</h1>
            <p>{text.guideDetailPage.notFoundDescription}</p>
            <div className="bl-guides-empty-links">
              <Link to="/guides">{text.guideDetailPage.backToGuides}</Link>
              <Link to="/search">{text.guideDetailPage.exploreVenues}</Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const display = getCollectionDisplay(collection, language);
  const matchedVenues = resolveEditorialCollectionVenues(collection, venues);

  return (
    <div className="bl-guides-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-guides-main">
        <section className="bl-guide-detail-hero">
          <Link to="/guides" className="bl-guide-detail-back-link">
            ← {text.guideDetailPage.backToAllGuides}
          </Link>

          <p className="bl-guides-eyebrow">{text.guideDetailPage.curatedBy}</p>
          <h1>{display.title}</h1>
          <p className="bl-guide-detail-subtitle">{display.subtitle}</p>
          <p className="bl-guide-detail-description">{display.description}</p>

          <div className="bl-guide-detail-theme-row">
            {display.theme?.mood ? (
              <span>
                {text.guideDetailPage.mood}: {display.theme.mood}
              </span>
            ) : null}
            {display.theme?.area ? (
              <span>
                {text.guideDetailPage.area}: {display.theme.area}
              </span>
            ) : null}
            {display.theme?.budget ? (
              <span>
                {text.guideDetailPage.budget}: {display.theme.budget}
              </span>
            ) : null}
          </div>
        </section>

        <section className="bl-guide-detail-why">
          <h2>{text.guideDetailPage.whyMatters}</h2>
          <p>{display.whyItMatters}</p>
          {display.explanationChips?.length ? (
            <div className="bl-guides-card-chips">
              {display.explanationChips.map((chip) => (
                <span key={`${collection.slug}-detail-${chip}`}>{chip}</span>
              ))}
            </div>
          ) : null}
        </section>

        <section className="bl-guide-detail-venues">
          <div className="bl-guide-detail-section-head">
            <h2>{text.guideDetailPage.matchingVenues}</h2>
            <p>
              {formatFlowText(text.guideDetailPage.selectedForGuide, {
                count: matchedVenues.length,
              })}
            </p>
          </div>

          {matchedVenues.length === 0 ? (
            <div className="bl-guides-empty-state">
              <h3>{text.guideDetailPage.noVenuesTitle}</h3>
              <p>{text.guideDetailPage.noVenuesDescription}</p>
              <Link to="/search">{text.guideDetailPage.openSearch}</Link>
            </div>
          ) : (
            <div className="bl-guide-detail-venue-grid">
              {matchedVenues.map((venue) => {
                const vd = getVenueDisplay(venue, language);
                const badges = getBestForBadges(vd, 2, language);
                const signals = getVenuePersonalitySignals(vd, language).slice(0, 2);

                return (
                  <article
                    key={venue.slug}
                    className="bl-guide-detail-venue-card"
                  >
                    <p className="bl-guide-detail-venue-category">
                      {dictionary.categoryNames[venue.categorySlug] ?? venue.category}
                    </p>
                    <h3>{venue.name}</h3>
                    <p className="bl-guide-detail-venue-area">
                      📍 {venue.area}
                    </p>
                    <p className="bl-guide-detail-venue-description">
                      {vd.shortDescription ?? vd.description}
                    </p>

                    {badges.length > 0 ? (
                      <div className="bl-guide-detail-venue-badges">
                        {badges.map((badge, index) => (
                          <span key={`${venue.slug}-badge-${badge}-${index}`}>
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
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="bl-guide-detail-cta-row">
          <Link to="/map">{text.guideDetailPage.viewOnMap}</Link>
          <Link to="/plan">{text.guideDetailPage.planOuting}</Link>
          {display.cta ? (
            <Link to={display.cta.href}>{display.cta.label}</Link>
          ) : null}
        </section>
      </main>
    </div>
  );
}
