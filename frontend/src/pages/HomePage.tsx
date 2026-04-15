import { Link } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { HomeHero } from "../components/home/HomeHero";
import { VenueCard } from "../components/home/VenueCard";
import { categories, featuredVenueSlugs, venues } from "../data/mockData";
import { useI18n } from "../i18n/I18nProvider";
import "./HomePage.css";

export default function HomePage() {
  const { dictionary } = useI18n();

  const featuredVenues = featuredVenueSlugs
    .map((slug) => venues.find((venue) => venue.slug === slug))
    .filter((venue): venue is (typeof venues)[number] => venue !== undefined);

  return (
    <div className="bl-home">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-home-main">
        <HomeHero texts={dictionary.hero} />

        <section id="categories" className="bl-home-section">
          <div className="bl-home-section-head">
            <p className="bl-home-eyebrow">{dictionary.home.categoriesEyebrow}</p>
            <h2 className="bl-home-section-title">{dictionary.home.categoriesTitle}</h2>
            <p className="bl-home-section-subtitle">
              {dictionary.home.categoriesSubtitle}
            </p>
          </div>

          <div className="bl-home-categories-grid">
            {categories.map((category) => (
              <Link
                key={category.slug}
                to={`/categories/${category.slug}`}
                className="bl-home-category-card"
              >
                <div className="bl-home-category-title-row">
                  <h3 className="bl-home-category-title">{category.name}</h3>
                  <span className="bl-home-category-arrow">→</span>
                </div>
                <p className="bl-home-category-description">
                  {dictionary.categoryDescriptions[category.slug] ?? category.description}
                </p>
                <p className="bl-home-category-action">{dictionary.home.categoriesAction}</p>
              </Link>
            ))}
          </div>
        </section>

        <section id="venues" className="bl-home-section">
          <div className="bl-home-section-head">
            <p className="bl-home-eyebrow">{dictionary.home.featuredEyebrow}</p>
            <h2 className="bl-home-section-title">{dictionary.home.featuredTitle}</h2>
            <p className="bl-home-section-subtitle">{dictionary.home.featuredSubtitle}</p>
          </div>

          <div className="bl-home-venues-grid">
            {featuredVenues.map((venue) => (
              <VenueCard
                key={venue.slug}
                category={venue.category}
                name={venue.name}
                area={venue.area}
                description={venue.description}
                href={`/venues/${venue.slug}?from=home`}
                isFeatured
                labels={dictionary.venueCard}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="bl-home-footer">
        <div className="bl-home-footer-inner">
          <p>© {new Date().getFullYear()} Blaniko</p>
          <p>{dictionary.home.footerText}</p>
        </div>
      </footer>
    </div>
  );
}
