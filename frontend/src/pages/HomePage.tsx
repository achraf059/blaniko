import { Link } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { HomeHero } from "../components/home/HomeHero";
import { VenueCard } from "../components/home/VenueCard";
import { categories, featuredVenueSlugs, venues } from "../data/mockData";
import "./HomePage.css";

export default function HomePage() {
  const featuredVenues = featuredVenueSlugs
    .map((slug) => venues.find((venue) => venue.slug === slug))
    .filter((venue): venue is (typeof venues)[number] => venue !== undefined);

  const labels = {
    header: {
      home: "Home",
      categories: "Categories",
      venues: "Venues",
      about: "About Us",
      exploreNow: "Explore now",
    },
    hero: {
      badge: "Casablanca Discovery Platform",
      title: "Discover the best things to do in Casablanca.",
      subtitle:
        "Find cafes, restaurants, sports spots, and unique city experiences in one simple place. Blaniko helps you explore Casablanca like a local.",
      discoverVenues: "Discover venues",
      browseCategories: "Browse categories",
      popularAreas: "Popular areas: Maarif, Ain Diab, Gauthier, Old Medina",
    },
    home: {
      categoriesEyebrow: "Browse by mood",
      categoriesTitle: "Explore categories",
      categoriesSubtitle:
        "Start with a vibe, then discover places across Casablanca.",
      categoriesAction: "Explore category",
      featuredEyebrow: "Curated places",
      featuredTitle: "Featured venues",
      featuredSubtitle: "Handpicked spots to start exploring Casablanca.",
      footerText: "Discover what to do in Casablanca.",
    },
    venueCard: {
      featured: "Featured",
      viewDetails: "View details",
    },
  };

  return (
    <div className="bl-home">
      <HomeHeader labels={labels.header} />

      <main className="bl-home-main">
        <HomeHero texts={labels.hero} />

        <section id="categories" className="bl-home-section">
          <div className="bl-home-section-head">
            <p className="bl-home-eyebrow">{labels.home.categoriesEyebrow}</p>
            <h2 className="bl-home-section-title">{labels.home.categoriesTitle}</h2>
            <p className="bl-home-section-subtitle">
              {labels.home.categoriesSubtitle}
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
                <p className="bl-home-category-description">{category.description}</p>
                <p className="bl-home-category-action">{labels.home.categoriesAction}</p>
              </Link>
            ))}
          </div>
        </section>

        <section id="venues" className="bl-home-section">
          <div className="bl-home-section-head">
            <p className="bl-home-eyebrow">{labels.home.featuredEyebrow}</p>
            <h2 className="bl-home-section-title">{labels.home.featuredTitle}</h2>
            <p className="bl-home-section-subtitle">{labels.home.featuredSubtitle}</p>
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
                labels={labels.venueCard}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="bl-home-footer">
        <div className="bl-home-footer-inner">
          <p>© {new Date().getFullYear()} Blaniko</p>
          <p>{labels.home.footerText}</p>
        </div>
      </footer>
    </div>
  );
}
