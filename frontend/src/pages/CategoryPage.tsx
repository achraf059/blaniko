import { Link, useParams } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueCard } from "../components/home/VenueCard";
import { categories, getVenueDisplay } from "../data/mockData";
import { useFavorites } from "../hooks/useFavorites";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import { getVenueImageSrc } from "../utils/venueImage";
import "./CategoryPage.css";

export default function CategoryPage() {
  const { slug } = useParams();
  const { dictionary, language } = useI18n();
  const { venues, isLoading } = useVenues();
  const { isFavorite, toggleFavorite } = useFavorites();

  const category = categories.find((item) => item.slug === slug);

  if (isLoading) {
    return (
      <div className="bl-category-page">
        <HomeHeader labels={dictionary.header} />
        <main className="bl-category-main">
          <section className="bl-category-not-found">
            <p style={{ opacity: 0.5 }}>Finding places…</p>
          </section>
        </main>
      </div>
    );
  }

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
        {/* Back link — above the hero, not inside it */}
        <div className="bl-category-back-wrap">
          <Link to="/" className="bl-category-back-link">
            ← {dictionary.categoryPage.backHome}
          </Link>
        </div>

        {/* Editorial hero */}
        <section className={`bl-category-hero bl-category-hero--${category.slug}`}>
          <div className="bl-category-hero-glow-right" aria-hidden="true" />
          <div className="bl-category-hero-glow-left" aria-hidden="true" />

          <div className="bl-category-hero-content">
            <p className="bl-category-eyebrow">
              {dictionary.categoryPage.eyebrow}
            </p>

            <h1 className="bl-category-title">{category.name}</h1>

            <p className="bl-category-description">
              {dictionary.categoryDescriptions[category.slug] ??
                category.description}
            </p>

            <p className="bl-category-result-line">
              {categoryVenues.length}{" "}
              {categoryVenues.length === 1
                ? dictionary.categoryPage.result
                : dictionary.categoryPage.results}{" "}
              to explore
            </p>
          </div>
        </section>

        {/* Separator between hero and grid */}
        <div className="bl-category-grid-sep" role="separator" aria-hidden="true" />

        {/* Venue grid */}
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
                  imageUrl={getVenueImageSrc(venue)}
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
