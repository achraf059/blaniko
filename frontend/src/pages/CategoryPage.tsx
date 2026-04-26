import { Link, useParams } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueCard } from "../components/home/VenueCard";
import { categories, getVenueDisplay } from "../data/mockData";
import { useFavorites } from "../hooks/useFavorites";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import "./CategoryPage.css";

export default function CategoryPage() {
  const { slug } = useParams();
  const { dictionary, language } = useI18n();
  const { venues } = useVenues();
  const { isFavorite, toggleFavorite } = useFavorites();

  const category = categories.find((item) => item.slug === slug);

  if (!category) {
    return (
      <div className="bl-category-page">
        <HomeHeader labels={dictionary.header} />

        <main className="bl-category-main">
          <section className="bl-category-not-found">
            <Link to="/" className="bl-category-back-link">
              ← {dictionary.categoryPage.backHome}
            </Link>

            <h1 className="bl-category-not-found-title">
              {dictionary.categoryPage.notFoundTitle}
            </h1>

            <p className="bl-category-not-found-description">
              {dictionary.categoryPage.notFoundDescription}
            </p>
          </section>
        </main>
      </div>
    );
  }

  const categoryVenues = venues.filter((venue) => venue.categorySlug === slug);
  const otherCategories = categories.filter((c) => c.slug !== slug);

  return (
    <div className="bl-category-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-category-main">
        {/* Editorial identity hero with category-specific accent */}
        <section className={`bl-category-hero bl-category-hero--${category.slug}`}>
          <div className="bl-category-hero-glow-right" aria-hidden="true" />
          <div className="bl-category-hero-glow-left" aria-hidden="true" />

          <div className="bl-category-hero-content">
            <Link to="/" className="bl-category-back-link">
              ← {dictionary.categoryPage.backHome}
            </Link>

            <p className="bl-category-eyebrow">
              {dictionary.categoryPage.eyebrow}
            </p>

            <h1 className="bl-category-title">{category.name}</h1>

            <p className="bl-category-description">
              {dictionary.categoryDescriptions[category.slug] ??
                category.description}
            </p>

            <div className="bl-category-result-pill">
              <span className="bl-category-result-count">
                {categoryVenues.length}
              </span>
              <span>
                {categoryVenues.length === 1
                  ? dictionary.categoryPage.result
                  : dictionary.categoryPage.results}
              </span>
            </div>
          </div>
        </section>

        {/* Venue grid using refreshed VenueCard */}
        <section className="bl-category-venues-section">
          <div className="bl-category-venues-grid">
            {categoryVenues.map((venue) => {
              const vd = getVenueDisplay(venue, language);
              return (
                <VenueCard
                  key={venue.slug}
                  slug={venue.slug}
                  category={
                    dictionary.categoryNames[venue.categorySlug] ??
                    venue.category
                  }
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
                  href={`/venues/${venue.slug}?from=category&category=${slug}`}
                  isFavorite={isFavorite(venue.slug)}
                  onToggleFavorite={toggleFavorite}
                  showCollectionPicker
                  language={language}
                  labels={dictionary.venueCard}
                />
              );
            })}
          </div>
        </section>

        {/* Explore other categories */}
        {otherCategories.length > 0 ? (
          <section className="bl-category-other-section">
            <p className="bl-category-other-label">
              {dictionary.header.categories}
            </p>
            <div className="bl-category-other-list">
              {otherCategories.map((c) => (
                <Link
                  key={c.slug}
                  to={`/categories/${c.slug}`}
                  className="bl-category-other-pill"
                >
                  {dictionary.categoryNames[c.slug] ?? c.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
