import { Link } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueCard } from "../components/home/VenueCard";
import { getVenueDisplay } from "../data/mockData";
import { useFavorites } from "../hooks/useFavorites";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import { getFlowTexts } from "../i18n/flowTexts";
import "./HomePage.css";
import "./FavoritesPage.css";

export default function FavoritesPage() {
  const { dictionary, language } = useI18n();
  const text = getFlowTexts(language);
  const { venues } = useVenues();
  const {
    favoriteSlugs,
    favoritesCount,
    isFavorite,
    toggleFavorite,
    clearFavorites,
  } = useFavorites();

  const favoriteVenues = favoriteSlugs
    .map((slug) => venues.find((venue) => venue.slug === slug))
    .filter((venue): venue is (typeof venues)[number] => venue !== undefined);

  return (
    <div className="bl-favorites-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-favorites-main">
        <section className="bl-favorites-hero">
          <p className="bl-favorites-eyebrow">
            {dictionary.favoritesPage.eyebrow}
          </p>
          <h1 className="bl-favorites-title">
            {dictionary.favoritesPage.title}
          </h1>
          <p className="bl-favorites-subtitle">
            {dictionary.favoritesPage.subtitle}
          </p>

          <div className="bl-favorites-meta-row">
            <p className="bl-favorites-count">
              <span>{favoritesCount}</span>{" "}
              {dictionary.favoritesPage.savedLabel}
            </p>

            <Link to="/collections" className="bl-favorites-back-link">
              {text.common.openCollections}
            </Link>

            {favoritesCount > 0 ? (
              <button
                type="button"
                className="bl-favorites-clear-btn"
                onClick={clearFavorites}
              >
                {dictionary.favoritesPage.clearAll}
              </button>
            ) : null}
          </div>
        </section>

        {favoriteVenues.length > 0 ? (
          <section className="bl-favorites-results">
            <div className="bl-home-venues-grid">
              {favoriteVenues.map((venue) => {
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
                    href={`/venues/${venue.slug}?from=favorites`}
                    language={language}
                    labels={dictionary.venueCard}
                    isFavorite={isFavorite(venue.slug)}
                    onToggleFavorite={toggleFavorite}
                  />
                );
              })}
            </div>
          </section>
        ) : (
          <section className="bl-favorites-empty">
            <h2 className="bl-favorites-empty-title">
              {dictionary.favoritesPage.emptyTitle}
            </h2>
            <p className="bl-favorites-empty-description">
              {dictionary.favoritesPage.emptyDescription}
            </p>
            <Link to="/" className="bl-favorites-back-link">
              ← {dictionary.favoritesPage.browseHome}
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
