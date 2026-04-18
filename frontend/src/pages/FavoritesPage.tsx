import { Link } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueCard } from "../components/home/VenueCard";
import { useFavorites } from "../hooks/useFavorites";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import "./HomePage.css";
import "./FavoritesPage.css";

export default function FavoritesPage() {
  const { dictionary } = useI18n();
  const { venues } = useVenues();
  const { favoriteSlugs, favoritesCount, isFavorite, toggleFavorite, clearFavorites } =
    useFavorites();

  const favoriteVenues = favoriteSlugs
    .map((slug) => venues.find((venue) => venue.slug === slug))
    .filter((venue): venue is (typeof venues)[number] => venue !== undefined);

  return (
    <div className="bl-favorites-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-favorites-main">
        <section className="bl-favorites-hero">
          <p className="bl-favorites-eyebrow">{dictionary.favoritesPage.eyebrow}</p>
          <h1 className="bl-favorites-title">{dictionary.favoritesPage.title}</h1>
          <p className="bl-favorites-subtitle">{dictionary.favoritesPage.subtitle}</p>

          <div className="bl-favorites-meta-row">
            <p className="bl-favorites-count">
              <span>{favoritesCount}</span> {dictionary.favoritesPage.savedLabel}
            </p>

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
              {favoriteVenues.map((venue) => (
                <VenueCard
                  key={venue.slug}
                  slug={venue.slug}
                  category={venue.category}
                  name={venue.name}
                  area={venue.area}
                  description={venue.description}
                  href={`/venues/${venue.slug}?from=favorites`}
                  labels={dictionary.venueCard}
                  isFavorite={isFavorite(venue.slug)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="bl-favorites-empty">
            <h2 className="bl-favorites-empty-title">{dictionary.favoritesPage.emptyTitle}</h2>
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
