import { Link, useParams } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueCard } from "../components/home/VenueCard";
import { categories, venues } from "../data/mockData";
import "./CategoryPage.css";

export default function CategoryPage() {
  const { slug } = useParams();

  const category = categories.find((item) => item.slug === slug);

  const labels = {
    header: {
      home: "Home",
      categories: "Categories",
      venues: "Venues",
      about: "About Us",
      exploreNow: "Explore now",
    },
    categoryPage: {
      backHome: "Back to homepage",
      eyebrow: "Casablanca category",
      notFoundTitle: "Category not found",
      notFoundDescription:
        "Sorry, we could not find this category yet. Try another one from the homepage.",
      result: "result",
      results: "results",
    },
    venueCard: {
      viewDetails: "View details",
      featured: "Featured",
    },
  };

  if (!category) {
    return (
      <div className="bl-category-page">
        <HomeHeader labels={labels.header} />

        <main className="bl-category-main">
          <section className="bl-category-not-found">
            <Link to="/" className="bl-category-back-link">
              ← {labels.categoryPage.backHome}
            </Link>

            <h1 className="bl-category-not-found-title">
              {labels.categoryPage.notFoundTitle}
            </h1>

            <p className="bl-category-not-found-description">
              {labels.categoryPage.notFoundDescription}
            </p>
          </section>
        </main>
      </div>
    );
  }

  const categoryVenues = venues.filter((venue) => venue.categorySlug === slug);

  return (
    <div className="bl-category-page">
      <HomeHeader labels={labels.header} />

      <main className="bl-category-main">
        <section className="bl-category-hero">
          <div className="bl-category-hero-glow-right" />
          <div className="bl-category-hero-glow-left" />

          <div className="bl-category-hero-content">
            <Link to="/" className="bl-category-back-link">
              ← {labels.categoryPage.backHome}
            </Link>

            <p className="bl-category-eyebrow">{labels.categoryPage.eyebrow}</p>

            <h1 className="bl-category-title">{category.name}</h1>

            <p className="bl-category-description">{category.description}</p>

            <div className="bl-category-result-pill">
              <span className="bl-category-result-count">{categoryVenues.length}</span>
              <span>
                {categoryVenues.length === 1
                  ? labels.categoryPage.result
                  : labels.categoryPage.results}
              </span>
            </div>
          </div>
        </section>

        <section className="bl-category-venues-section">
          <div className="bl-category-venues-grid">
            {categoryVenues.map((venue) => (
              <VenueCard
                key={venue.slug}
                category={venue.category}
                name={venue.name}
                area={venue.area}
                description={venue.description}
                href={`/venues/${venue.slug}?from=category&category=${slug}`}
                labels={labels.venueCard}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
