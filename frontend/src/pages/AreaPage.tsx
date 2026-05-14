import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueCard } from "../components/home/VenueCard";
import {
  areaProfiles,
  getAreaBySlug,
  getAreaDisplay,
  venueMatchesArea,
} from "../data/areas";
import { getVenueDisplay } from "../data/mockData";
import { useFavorites } from "../hooks/useFavorites";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import { formatFlowText, getFlowTexts } from "../i18n/flowTexts";
import "./HomePage.css";
import "./AreaPage.css";

export default function AreaPage() {
  const { slug } = useParams();
  const location = useLocation();
  const { dictionary, language } = useI18n();
  const text = getFlowTexts(language);
  const { venues } = useVenues();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { trackActivity } = useRecentActivity();

  const area = getAreaBySlug(slug);

  useEffect(() => {
    if (!area) {
      return;
    }

    trackActivity({
      id: area.slug,
      type: "area",
      title: area.name,
      href: `${location.pathname}${location.search}`,
    });
  }, [area, location.pathname, location.search, trackActivity]);

  if (!area) {
    return (
      <div className="bl-area-page">
        <HomeHeader labels={dictionary.header} />

        <main className="bl-area-main">
          <section className="bl-area-not-found">
            <Link to="/" className="bl-area-back-link">
              ← {text.areaPage.backHome}
            </Link>

            <h1 className="bl-area-not-found-title">{text.areaPage.notFoundTitle}</h1>
            <p className="bl-area-not-found-description">
              {text.areaPage.notFoundDescription}
            </p>

            <div className="bl-area-not-found-links">
              {areaProfiles.map((candidate) => (
                <Link key={candidate.slug} to={`/areas/${candidate.slug}`}>
                  {candidate.name}
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  const areaVenues = venues.filter((venue) =>
    venueMatchesArea(venue, area.slug),
  );

  const display = getAreaDisplay(area, language);

  return (
    <div className="bl-area-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-area-main">
        <section className="bl-area-hero">
          <div className="bl-area-hero-glow-right" />
          <div className="bl-area-hero-glow-left" />

          <div className="bl-area-hero-content">
            <Link to="/" className="bl-area-back-link">
              ← {text.areaPage.backHome}
            </Link>

            <p className="bl-area-eyebrow">{text.areaPage.eyebrow}</p>
            <h1 className="bl-area-title">{area.name}</h1>
            <p className="bl-area-description">{display.intro}</p>

            <div className="bl-area-meta-grid">
              <div className="bl-area-meta-card">
                <p className="bl-area-meta-label">{text.areaPage.personality}</p>
                <p className="bl-area-meta-value">{display.personality}</p>
              </div>
              <div className="bl-area-meta-card">
                <p className="bl-area-meta-label">{text.common.bestFor}</p>
                <p className="bl-area-meta-value">{display.bestFor}</p>
              </div>
              <div className="bl-area-meta-card">
                <p className="bl-area-meta-label">{text.areaPage.vibe}</p>
                <p className="bl-area-meta-value">{display.vibeSummary}</p>
              </div>
            </div>

            <p className="bl-area-curated-hint">{display.curatedHint}</p>

            <div className="bl-area-actions">
              <Link
                to={`/search?q=${encodeURIComponent(area.name)}`}
                className="bl-area-action-link"
              >
                {formatFlowText(text.areaPage.browsePlacesIn, { area: area.name })}
              </Link>
              <Link
                to={`/map?q=${encodeURIComponent(area.name)}`}
                className="bl-area-action-link"
              >
                {text.areaPage.viewOnMap}
              </Link>
              <Link
                to={`/plan?area=${encodeURIComponent(area.slug)}`}
                className="bl-area-action-link"
              >
                {formatFlowText(text.areaPage.planOutingIn, { area: area.name })}
              </Link>
            </div>
          </div>
        </section>

        <section className="bl-area-venues-section">
          <div className="bl-area-results-pill">
            <span className="bl-area-results-count">{areaVenues.length}</span>
            <span>
              {areaVenues.length === 1
                ? text.areaPage.curatedVenueOne
                : text.areaPage.curatedVenueMany}
            </span>
          </div>

          {areaVenues.length > 0 ? (
            <div className="bl-area-venues-grid">
              {areaVenues.map((venue) => {
                const vd = getVenueDisplay(venue, language);
                return (
                  <VenueCard
                    key={venue.slug}
                    slug={venue.slug}
                    category={dictionary.categoryNames[venue.categorySlug] ?? venue.category}
                    name={venue.name}
                    area={venue.area}
                    description={vd.description}
                    personality={{
                      bestForTags: venue.bestForTags,
                      timeOfDay: venue.timeOfDay,
                      energyLevel: venue.energyLevel,
                      socialLevel: venue.socialLevel,
                      spaceType: venue.spaceType,
                    }}
                    href={`/venues/${venue.slug}?from=area&area=${area.slug}`}
                    isFavorite={isFavorite(venue.slug)}
                    onToggleFavorite={toggleFavorite}
                    language={language}
                    labels={dictionary.venueCard}
                  />
                );
              })}
            </div>
          ) : (
            <div className="bl-area-empty">
              <h3>{text.areaPage.emptyTitle}</h3>
              <p>{text.areaPage.emptyDescription}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
