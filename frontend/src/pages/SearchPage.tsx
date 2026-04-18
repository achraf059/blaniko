import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { BudgetSelector } from "../components/discovery/BudgetSelector";
import { FilterChips } from "../components/discovery/FilterChips";
import { SearchBar } from "../components/discovery/SearchBar";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueCard } from "../components/home/VenueCard";
import { categories, venues } from "../data/mockData";
import { useFavorites } from "../hooks/useFavorites";
import { useI18n } from "../i18n/useI18n";
import "./HomePage.css";
import "./SearchPage.css";

export default function SearchPage() {
  const { dictionary } = useI18n();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [searchParams] = useSearchParams();

  const queryFromUrl = searchParams.get("q") ?? "";
  const categoryFromUrl = searchParams.get("category") ?? "";
  const budgetFromUrlRaw = searchParams.get("budget") ?? "all";

  const allowedBudgets = new Set(["all", "$", "$$", "$$$"]);
  const budgetFromUrl = allowedBudgets.has(budgetFromUrlRaw)
    ? budgetFromUrlRaw
    : "all";

  const [query, setQuery] = useState(queryFromUrl);
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl);
  const [selectedBudget, setSelectedBudget] = useState(budgetFromUrl);

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

  const budgetOptions = [
    { value: "all", label: dictionary.searchPage.budgetAll },
    { value: "$", label: dictionary.searchPage.budgetLow },
    { value: "$$", label: dictionary.searchPage.budgetMid },
    { value: "$$$", label: dictionary.searchPage.budgetHigh },
  ];

  const buildUrl = (overrides?: {
    query?: string;
    category?: string;
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

    if (nextBudget && nextBudget !== "all") {
      params.set("budget", nextBudget);
    }

    const suffix = params.toString();
    return suffix ? `/search?${suffix}` : "/search";
  };

  const filteredVenues = useMemo(() => {
    return venues.filter((venue) => {
      if (query.trim()) {
        const haystack = [venue.name, venue.category, venue.area, venue.description]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query.trim().toLowerCase())) {
          return false;
        }
      }

      if (selectedCategory && venue.categorySlug !== selectedCategory) {
        return false;
      }

      if (selectedBudget !== "all" && venue.priceLevel !== selectedBudget) {
        return false;
      }

      return true;
    });
  }, [query, selectedBudget, selectedCategory]);

  const selectedCategoryName = categories.find(
    (category) => category.slug === selectedCategory
  )?.name;

  const title = query.trim()
    ? dictionary.searchPage.titleForQuery.replace("{query}", query.trim())
    : dictionary.searchPage.titleDefault;

  const handleSearchSubmit = () => {
    navigate(buildUrl());
  };

  const handleCategorySelect = (slug: string) => {
    const nextCategory = selectedCategory === slug ? "" : slug;
    setSelectedCategory(nextCategory);
    navigate(buildUrl({ category: nextCategory }));
  };

  const handleBudgetSelect = (value: string) => {
    setSelectedBudget(value);
    navigate(buildUrl({ budget: value }));
  };

  const clearFilters = () => {
    setQuery("");
    setSelectedCategory("");
    setSelectedBudget("all");
    navigate("/search");
  };

  return (
    <div className="bl-search-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-search-main">
        <section className="bl-search-hero">
          <p className="bl-search-eyebrow">{dictionary.searchPage.eyebrow}</p>
          <h1 className="bl-search-title">{title}</h1>
          <p className="bl-search-subtitle">{dictionary.searchPage.subtitle}</p>

          <div className="bl-search-controls">
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={handleSearchSubmit}
              placeholder={dictionary.searchPage.searchPlaceholder}
              submitLabel={dictionary.searchPage.searchAction}
            />

            <div>
              <p className="bl-discovery-label">{dictionary.searchPage.quickFiltersLabel}</p>
              <FilterChips
                options={quickFilters}
                selectedValue={selectedCategory || undefined}
                onSelect={handleCategorySelect}
              />
            </div>

            <div className="bl-search-budget-row">
              <div>
                <p className="bl-discovery-label">{dictionary.searchPage.budgetLabel}</p>
                <BudgetSelector
                  options={budgetOptions}
                  selectedValue={selectedBudget}
                  onSelect={handleBudgetSelect}
                />
              </div>

              <button type="button" className="bl-search-clear-btn" onClick={clearFilters}>
                {dictionary.searchPage.clearFilters}
              </button>
            </div>
          </div>

          <div className="bl-search-params">
            <p>
              {dictionary.searchPage.summaryQuery}: <span>{query || "—"}</span>
            </p>
            <p>
              {dictionary.searchPage.summaryCategory}: <span>{selectedCategoryName || "—"}</span>
            </p>
            <p>
              {dictionary.searchPage.summaryBudget}: <span>{selectedBudget === "all" ? dictionary.searchPage.budgetAll : selectedBudget}</span>
            </p>
            <p>
              {filteredVenues.length} {dictionary.searchPage.resultsLabel}
            </p>
          </div>
        </section>

        {filteredVenues.length > 0 ? (
          <section className="bl-search-results">
            <div className="bl-home-venues-grid">
              {filteredVenues.map((venue) => (
                <VenueCard
                  key={venue.slug}
                  slug={venue.slug}
                  category={venue.category}
                  name={venue.name}
                  area={venue.area}
                  description={venue.description}
                  href={`/venues/${venue.slug}?from=search`}
                  isFavorite={isFavorite(venue.slug)}
                  onToggleFavorite={toggleFavorite}
                  labels={dictionary.venueCard}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="bl-search-empty">
            <h2 className="bl-search-empty-title">{dictionary.searchPage.emptyTitle}</h2>
            <p className="bl-search-empty-description">{dictionary.searchPage.emptyDescription}</p>
            <Link to="/" className="bl-search-back-link">
              ← {dictionary.recommendationsPage.backHome}
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
