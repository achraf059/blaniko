import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useNavigate } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { HomeHero } from "../components/home/HomeHero";
import { VenueCard } from "../components/home/VenueCard";
import { categories, featuredVenueSlugs, venues } from "../data/mockData";
import { useFavorites } from "../hooks/useFavorites";
import { useI18n } from "../i18n/useI18n";
import "./HomePage.css";

export default function HomePage() {
  const { dictionary } = useI18n();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedBudget, setSelectedBudget] = useState("all");

  const featuredVenues = featuredVenueSlugs
    .map((slug) => venues.find((venue) => venue.slug === slug))
    .filter((venue): venue is (typeof venues)[number] => venue !== undefined);

  const quickFilters = useMemo(
    () =>
      categories
        .filter((category) =>
          ["cafes", "restaurants", "activities", "sports", "gaming", "outdoor"].includes(
            category.slug
          )
        )
        .map((category) => ({ value: category.slug, label: category.name })),
    []
  );

  const buildSearchUrl = (overrides?: {
    category?: string;
    query?: string;
    budget?: string;
  }) => {
    const params = new URLSearchParams();
    const nextQuery = overrides?.query ?? query;
    const nextCategory = overrides?.category ?? selectedCategory;
    const nextBudget = overrides?.budget ?? selectedBudget;

    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim());
    }

    if (nextCategory) {
      params.set("category", nextCategory);
    }

    if (nextBudget !== "all") {
      params.set("budget", nextBudget);
    }

    const suffix = params.toString();
    return suffix ? `/search?${suffix}` : "/search";
  };

  const handleSearchSubmit = () => {
    navigate(buildSearchUrl());
  };

  const handleFilterSelect = (categorySlug: string) => {
    const nextCategory = selectedCategory === categorySlug ? undefined : categorySlug;
    setSelectedCategory(nextCategory);
    navigate(buildSearchUrl({ category: nextCategory }));
  };

  const handleRecommendationsClick = () => {
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("q", query.trim());
    }

    if (selectedCategory) {
      params.set("category", selectedCategory);
    }

    if (selectedBudget !== "all") {
      params.set("budget", selectedBudget);
    }

    const suffix = params.toString();
    navigate(suffix ? `/recommendations?${suffix}` : "/recommendations");
  };

  return (
    <div className="bl-home">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-home-main">
        <HomeHero
          texts={dictionary.hero}
          searchValue={query}
          onSearchValueChange={setQuery}
          onSearchSubmit={handleSearchSubmit}
          quickFilters={quickFilters}
          selectedFilter={selectedCategory}
          onFilterSelect={handleFilterSelect}
          budgetValue={selectedBudget}
          onBudgetChange={setSelectedBudget}
          onRecommendationsClick={handleRecommendationsClick}
        />

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
                slug={venue.slug}
                category={venue.category}
                name={venue.name}
                area={venue.area}
                description={venue.description}
                href={`/venues/${venue.slug}?from=home`}
                isFeatured
                isFavorite={isFavorite(venue.slug)}
                onToggleFavorite={toggleFavorite}
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
