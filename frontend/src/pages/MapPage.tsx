import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { BudgetSelector } from "../components/discovery/BudgetSelector";
import { FilterChips } from "../components/discovery/FilterChips";
import { SearchBar } from "../components/discovery/SearchBar";
import { HomeHeader } from "../components/home/HomeHeader";
import { categories, type Venue } from "../data/mockData";
import { useFavorites } from "../hooks/useFavorites";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import "./HomePage.css";
import "./MapPage.css";

type MappedVenue = Venue & {
  coordinates: {
    lat: number;
    lng: number;
  };
};

const MAP_PADDING_PERCENT = 7;

function toMappedVenues(input: Venue[]): MappedVenue[] {
  return input.filter(
    (venue): venue is MappedVenue =>
      typeof venue.coordinates?.lat === "number" && typeof venue.coordinates?.lng === "number"
  );
}

export default function MapPage() {
  const { dictionary } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { venues } = useVenues();
  const { isFavorite, toggleFavorite } = useFavorites();

  const queryFromUrl = searchParams.get("q") ?? "";
  const categoryFromUrl = searchParams.get("category") ?? "";
  const budgetFromUrlRaw = searchParams.get("budget") ?? "all";

  const allowedBudgets = new Set(["all", "$", "$$", "$$$"]);
  const budgetFromUrl = allowedBudgets.has(budgetFromUrlRaw) ? budgetFromUrlRaw : "all";

  const [query, setQuery] = useState(queryFromUrl);
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl);
  const [selectedBudget, setSelectedBudget] = useState(budgetFromUrl);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const listRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
    { value: "all", label: dictionary.mapPage.budgetAll },
    { value: "$", label: dictionary.mapPage.budgetLow },
    { value: "$$", label: dictionary.mapPage.budgetMid },
    { value: "$$$", label: dictionary.mapPage.budgetHigh },
  ];

  const buildUrl = (overrides?: { query?: string; category?: string; budget?: string }) => {
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
    return suffix ? `/map?${suffix}` : "/map";
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
  }, [query, selectedBudget, selectedCategory, venues]);

  const mapVenues = useMemo(() => toMappedVenues(filteredVenues), [filteredVenues]);

  const activeSlug =
    selectedSlug && mapVenues.some((venue) => venue.slug === selectedSlug)
      ? selectedSlug
      : mapVenues[0]?.slug ?? null;

  const selectedVenue = mapVenues.find((venue) => venue.slug === activeSlug) ?? null;

  const coordinatesBounds = useMemo(() => {
    if (mapVenues.length === 0) {
      return null;
    }

    const lats = mapVenues.map((venue) => venue.coordinates.lat);
    const lngs = mapVenues.map((venue) => venue.coordinates.lng);

    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [mapVenues]);

  const getMarkerStyle = (venue: MappedVenue) => {
    if (!coordinatesBounds) {
      return { left: "50%", top: "50%" };
    }

    const latRange = Math.max(coordinatesBounds.maxLat - coordinatesBounds.minLat, 0.0001);
    const lngRange = Math.max(coordinatesBounds.maxLng - coordinatesBounds.minLng, 0.0001);

    const x = (venue.coordinates.lng - coordinatesBounds.minLng) / lngRange;
    const y = (coordinatesBounds.maxLat - venue.coordinates.lat) / latRange;

    const mappedX = MAP_PADDING_PERCENT + x * (100 - MAP_PADDING_PERCENT * 2);
    const mappedY = MAP_PADDING_PERCENT + y * (100 - MAP_PADDING_PERCENT * 2);

    return {
      left: `${mappedX}%`,
      top: `${mappedY}%`,
    };
  };

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

  const handleSelectVenue = (slug: string, shouldFocusList = false) => {
    setSelectedSlug(slug);

    if (shouldFocusList) {
      const node = listRefs.current[slug];
      node?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  return (
    <div className="bl-map-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-map-main">
        <section className="bl-map-hero">
          <p className="bl-map-eyebrow">{dictionary.mapPage.eyebrow}</p>
          <h1 className="bl-map-title">{dictionary.mapPage.title}</h1>
          <p className="bl-map-subtitle">{dictionary.mapPage.subtitle}</p>
          <p className="bl-map-helper">{dictionary.mapPage.helperText}</p>

          <div className="bl-map-controls">
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={handleSearchSubmit}
              placeholder={dictionary.mapPage.searchPlaceholder}
              submitLabel={dictionary.mapPage.searchAction}
            />

            <div>
              <p className="bl-discovery-label">{dictionary.mapPage.quickFiltersLabel}</p>
              <FilterChips
                options={quickFilters}
                selectedValue={selectedCategory || undefined}
                onSelect={handleCategorySelect}
              />
            </div>

            <div>
              <p className="bl-discovery-label">{dictionary.mapPage.budgetLabel}</p>
              <BudgetSelector
                options={budgetOptions}
                selectedValue={selectedBudget}
                onSelect={handleBudgetSelect}
              />
            </div>
          </div>
        </section>

        <section className="bl-map-layout">
          <div className="bl-map-panel">
            <div className="bl-map-panel-head">
              <h2>{dictionary.mapPage.mapTitle}</h2>
              <p>{mapVenues.length}</p>
            </div>

            {mapVenues.length > 0 ? (
              <div className="bl-map-canvas" role="application" aria-label={dictionary.mapPage.mapTitle}>
                <div className="bl-map-watermark">Casablanca</div>

                {mapVenues.map((venue) => {
                  const isActive = activeSlug === venue.slug;
                  return (
                    <button
                      key={venue.slug}
                      type="button"
                      className={`bl-map-marker${isActive ? " is-active" : ""}`}
                      style={getMarkerStyle(venue)}
                      onClick={() => handleSelectVenue(venue.slug, true)}
                      aria-label={venue.name}
                    >
                      <span className="bl-map-marker-dot" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="bl-map-empty">
                <h3>{dictionary.mapPage.emptyTitle}</h3>
                <p>{dictionary.mapPage.emptyDescription}</p>
              </div>
            )}

            {selectedVenue ? (
              <article className="bl-map-preview">
                <div className="bl-map-preview-top">
                  <p className="bl-map-preview-category">{selectedVenue.category}</p>
                  <button
                    type="button"
                    className={`bl-map-preview-favorite${
                      isFavorite(selectedVenue.slug) ? " is-active" : ""
                    }`}
                    onClick={() => toggleFavorite(selectedVenue.slug)}
                    aria-pressed={isFavorite(selectedVenue.slug)}
                  >
                    {isFavorite(selectedVenue.slug)
                      ? dictionary.venueCard.removeFavorite
                      : dictionary.venueCard.saveFavorite}
                  </button>
                </div>

                <h3 className="bl-map-preview-name">{selectedVenue.name}</h3>
                <p className="bl-map-preview-area">📍 {selectedVenue.area}</p>
                <p className="bl-map-preview-description">
                  {selectedVenue.shortDescription ?? selectedVenue.description}
                </p>

                <Link
                  to={`/venues/${selectedVenue.slug}?from=map`}
                  className="bl-map-preview-link"
                >
                  {dictionary.mapPage.viewDetails} →
                </Link>
              </article>
            ) : null}
          </div>

          <div className="bl-map-list-panel">
            <div className="bl-map-panel-head">
              <h2>{dictionary.mapPage.listTitle}</h2>
              <p>{mapVenues.length}</p>
            </div>

            <div className="bl-map-list">
              {mapVenues.map((venue) => {
                const isActive = activeSlug === venue.slug;
                return (
                  <div
                    key={venue.slug}
                    ref={(node) => {
                      listRefs.current[venue.slug] = node;
                    }}
                    className={`bl-map-list-item${isActive ? " is-active" : ""}`}
                  >
                    <div className="bl-map-list-item-top">
                      <p className="bl-map-list-item-category">{venue.category}</p>
                      {isActive ? (
                        <span className="bl-map-list-item-selected">
                          {dictionary.mapPage.selectedLabel}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="bl-map-list-item-title">{venue.name}</h3>
                    <p className="bl-map-list-item-area">📍 {venue.area}</p>
                    <p className="bl-map-list-item-description">
                      {venue.shortDescription ?? venue.description}
                    </p>

                    <div className="bl-map-list-item-actions">
                      <button
                        type="button"
                        className="bl-map-list-focus-btn"
                        onClick={() => handleSelectVenue(venue.slug)}
                      >
                        {dictionary.mapPage.showOnMap}
                      </button>

                      <button
                        type="button"
                        className={`bl-map-list-favorite-btn${
                          isFavorite(venue.slug) ? " is-active" : ""
                        }`}
                        onClick={() => toggleFavorite(venue.slug)}
                        aria-pressed={isFavorite(venue.slug)}
                      >
                        {isFavorite(venue.slug)
                          ? dictionary.venueCard.removeFavorite
                          : dictionary.venueCard.saveFavorite}
                      </button>

                      <Link to={`/venues/${venue.slug}?from=map`} className="bl-map-list-link">
                        {dictionary.mapPage.viewDetails}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
