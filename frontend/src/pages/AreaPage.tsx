import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueCard } from "../components/home/VenueCard";
import { areaProfiles, getAreaBySlug, venueMatchesArea } from "../data/areas";
import { useFavorites } from "../hooks/useFavorites";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import { explainVenueMatch } from "../utils/discoveryInsights";
import "./HomePage.css";
import "./AreaPage.css";

export default function AreaPage() {
  const { slug } = useParams();
  const location = useLocation();
  const { dictionary } = useI18n();
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
              ← Back home
            </Link>

            <h1 className="bl-area-not-found-title">Area not found</h1>
            <p className="bl-area-not-found-description">
              This neighborhood is not curated yet. Explore one of our main
              Casablanca areas.
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

  return (
    <div className="bl-area-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-area-main">
        <section className="bl-area-hero">
          <div className="bl-area-hero-glow-right" />
          <div className="bl-area-hero-glow-left" />

          <div className="bl-area-hero-content">
            <Link to="/" className="bl-area-back-link">
              ← Back home
            </Link>

            <p className="bl-area-eyebrow">Neighborhood guide</p>
            <h1 className="bl-area-title">{area.name}</h1>
            <p className="bl-area-description">{area.intro}</p>

            <div className="bl-area-meta-grid">
              <div className="bl-area-meta-card">
                <p className="bl-area-meta-label">Personality</p>
                <p className="bl-area-meta-value">{area.personality}</p>
              </div>
              <div className="bl-area-meta-card">
                <p className="bl-area-meta-label">Best for</p>
                <p className="bl-area-meta-value">{area.bestFor}</p>
              </div>
              <div className="bl-area-meta-card">
                <p className="bl-area-meta-label">Vibe</p>
                <p className="bl-area-meta-value">{area.vibeSummary}</p>
              </div>
            </div>

            <p className="bl-area-curated-hint">{area.curatedHint}</p>

            <div className="bl-area-actions">
              <Link
                to={`/search?q=${encodeURIComponent(area.name)}`}
                className="bl-area-action-link"
              >
                Browse all places in {area.name}
              </Link>
              <Link
                to={`/map?q=${encodeURIComponent(area.name)}`}
                className="bl-area-action-link"
              >
                View this area on map
              </Link>
              <Link
                to={`/plan?area=${encodeURIComponent(area.slug)}`}
                className="bl-area-action-link"
              >
                Plan an outing in {area.name}
              </Link>
            </div>
          </div>
        </section>

        <section className="bl-area-venues-section">
          <div className="bl-area-results-pill">
            <span className="bl-area-results-count">{areaVenues.length}</span>
            <span>
              {areaVenues.length === 1 ? "curated venue" : "curated venues"}
            </span>
          </div>

          {areaVenues.length > 0 ? (
            <div className="bl-area-venues-grid">
              {areaVenues.map((venue) => (
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
                  whyChips={explainVenueMatch(venue, { area: area.slug })}
                  href={`/venues/${venue.slug}?from=area&area=${area.slug}`}
                  isFavorite={isFavorite(venue.slug)}
                  onToggleFavorite={toggleFavorite}
                  labels={dictionary.venueCard}
                />
              ))}
            </div>
          ) : (
            <div className="bl-area-empty">
              <h3>We are still curating this area.</h3>
              <p>
                Try another neighborhood or use search to discover more
                Casablanca places.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
