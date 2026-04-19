import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { BudgetSelector } from "../components/discovery/BudgetSelector";
import { FilterChips } from "../components/discovery/FilterChips";
import { SearchBar } from "../components/discovery/SearchBar";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueCard } from "../components/home/VenueCard";
import { categories } from "../data/mockData";
import { useFavorites } from "../hooks/useFavorites";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import {
  discoveryMoodLabel,
  explainVenueMatch,
  isDiscoveryMood,
} from "../utils/discoveryInsights";
import {
  energyOptions,
  filterVenuesBySmartDiscovery,
  getAreaLabel,
  getAreaOptions,
  getBestForLabel,
  getBestForOptions,
  getOptionLabel,
  socialLevelOptions,
  spaceTypeOptions,
  timeOfDayOptions,
} from "../utils/discoveryFilters";
import "./HomePage.css";
import "./SearchPage.css";

const moodOptions = [
  { value: "chill", label: discoveryMoodLabel.chill },
  { value: "social", label: discoveryMoodLabel.social },
  { value: "active", label: discoveryMoodLabel.active },
  { value: "romantic", label: discoveryMoodLabel.romantic },
  { value: "family-friendly", label: discoveryMoodLabel["family-friendly"] },
];

export default function SearchPage() {
  const { dictionary } = useI18n();
  const navigate = useNavigate();
  const { venues } = useVenues();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [searchParams] = useSearchParams();

  const queryFromUrl = searchParams.get("q") ?? "";
  const categoryFromUrl = searchParams.get("category") ?? "";
  const moodFromUrlRaw = searchParams.get("mood") ?? "";
  const budgetFromUrlRaw = searchParams.get("budget") ?? "all";
  const areaFromUrl = searchParams.get("area") ?? "";
  const bestForFromUrl = searchParams.get("bestFor") ?? "";
  const timeOfDayFromUrl = searchParams.get("time") ?? "";
  const energyFromUrl = searchParams.get("energy") ?? "";
  const spaceFromUrl = searchParams.get("space") ?? "";
  const socialFromUrl = searchParams.get("social") ?? "";

  const allowedBudgets = new Set(["all", "$", "$$", "$$$"]);
  const budgetFromUrl = allowedBudgets.has(budgetFromUrlRaw)
    ? budgetFromUrlRaw
    : "all";

  const moodFromUrl = isDiscoveryMood(moodFromUrlRaw) ? moodFromUrlRaw : "";

  const [query, setQuery] = useState(queryFromUrl);
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl);
  const [selectedMood, setSelectedMood] = useState(moodFromUrl);
  const [selectedBudget, setSelectedBudget] = useState(budgetFromUrl);
  const [selectedArea, setSelectedArea] = useState(areaFromUrl);
  const [selectedBestFor, setSelectedBestFor] = useState(bestForFromUrl);
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState(timeOfDayFromUrl);
  const [selectedEnergyLevel, setSelectedEnergyLevel] = useState(energyFromUrl);
  const [selectedSpaceType, setSelectedSpaceType] = useState(spaceFromUrl);
  const [selectedSocialLevel, setSelectedSocialLevel] = useState(socialFromUrl);

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

  const areaOptions = useMemo(() => getAreaOptions(venues), [venues]);
  const bestForOptions = useMemo(() => getBestForOptions(venues), [venues]);

  const buildUrl = (overrides?: {
    query?: string;
    category?: string;
    mood?: string;
    budget?: string;
    area?: string;
    bestFor?: string;
    timeOfDay?: string;
    energyLevel?: string;
    spaceType?: string;
    socialLevel?: string;
  }) => {
    const params = new URLSearchParams();
    const nextQuery = overrides?.query ?? query;
    const nextCategory = overrides?.category ?? selectedCategory;
    const nextMood = overrides?.mood ?? selectedMood;
    const nextBudget = overrides?.budget ?? selectedBudget;
    const nextArea = overrides?.area ?? selectedArea;
    const nextBestFor = overrides?.bestFor ?? selectedBestFor;
    const nextTimeOfDay = overrides?.timeOfDay ?? selectedTimeOfDay;
    const nextEnergy = overrides?.energyLevel ?? selectedEnergyLevel;
    const nextSpaceType = overrides?.spaceType ?? selectedSpaceType;
    const nextSocialLevel = overrides?.socialLevel ?? selectedSocialLevel;

    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim());
    }

    if (nextCategory) {
      params.set("category", nextCategory);
    }

    if (nextMood) {
      params.set("mood", nextMood);
    }

    if (nextBudget && nextBudget !== "all") {
      params.set("budget", nextBudget);
    }

    if (nextArea) {
      params.set("area", nextArea);
    }

    if (nextBestFor) {
      params.set("bestFor", nextBestFor);
    }

    if (nextTimeOfDay) {
      params.set("time", nextTimeOfDay);
    }

    if (nextEnergy) {
      params.set("energy", nextEnergy);
    }

    if (nextSpaceType) {
      params.set("space", nextSpaceType);
    }

    if (nextSocialLevel) {
      params.set("social", nextSocialLevel);
    }

    const suffix = params.toString();
    return suffix ? `/search?${suffix}` : "/search";
  };

  const buildMapUrl = () => {
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("q", query.trim());
    }

    if (selectedCategory) {
      params.set("category", selectedCategory);
    }

    if (selectedMood) {
      params.set("mood", selectedMood);
    }

    if (selectedBudget !== "all") {
      params.set("budget", selectedBudget);
    }

    if (selectedArea) {
      params.set("area", selectedArea);
    }

    if (selectedBestFor) {
      params.set("bestFor", selectedBestFor);
    }

    if (selectedTimeOfDay) {
      params.set("time", selectedTimeOfDay);
    }

    if (selectedEnergyLevel) {
      params.set("energy", selectedEnergyLevel);
    }

    if (selectedSpaceType) {
      params.set("space", selectedSpaceType);
    }

    if (selectedSocialLevel) {
      params.set("social", selectedSocialLevel);
    }

    const suffix = params.toString();
    return suffix ? `/map?${suffix}` : "/map";
  };

  const selectedMoodValue = isDiscoveryMood(selectedMood) ? selectedMood : undefined;

  const filteredVenues = useMemo(
    () =>
      filterVenuesBySmartDiscovery(venues, {
        query,
        category: selectedCategory,
        mood: selectedMood,
        budget: selectedBudget,
        area: selectedArea,
        bestFor: selectedBestFor,
        timeOfDay: selectedTimeOfDay,
        energyLevel: selectedEnergyLevel,
        spaceType: selectedSpaceType,
        socialLevel: selectedSocialLevel,
      }),
    [
      query,
      selectedCategory,
      selectedMood,
      selectedBudget,
      selectedArea,
      selectedBestFor,
      selectedTimeOfDay,
      selectedEnergyLevel,
      selectedSpaceType,
      selectedSocialLevel,
      venues,
    ]
  );

  const selectedCategoryName = categories.find(
    (category) => category.slug === selectedCategory
  )?.name;
  const selectedMoodName = moodOptions.find((mood) => mood.value === selectedMood)?.label;
  const selectedAreaName = selectedArea ? getAreaLabel(selectedArea, areaOptions) : undefined;
  const selectedBestForName = selectedBestFor ? getBestForLabel(selectedBestFor) : undefined;
  const selectedTimeOfDayName = selectedTimeOfDay
    ? getOptionLabel(selectedTimeOfDay, timeOfDayOptions)
    : undefined;
  const selectedEnergyName = selectedEnergyLevel
    ? getOptionLabel(selectedEnergyLevel, energyOptions)
    : undefined;
  const selectedSpaceName = selectedSpaceType
    ? getOptionLabel(selectedSpaceType, spaceTypeOptions)
    : undefined;
  const selectedSocialName = selectedSocialLevel
    ? getOptionLabel(selectedSocialLevel, socialLevelOptions)
    : undefined;

  const activeFilterLabels = [
    selectedCategoryName ? `Category: ${selectedCategoryName}` : "",
    selectedMoodName ? `Mood: ${selectedMoodName}` : "",
    selectedAreaName ? `Area: ${selectedAreaName}` : "",
    selectedBestForName ? `Best for: ${selectedBestForName}` : "",
    selectedTimeOfDayName ? `Time: ${selectedTimeOfDayName}` : "",
    selectedEnergyName ? `Energy: ${selectedEnergyName}` : "",
    selectedSpaceName ? `Space: ${selectedSpaceName}` : "",
    selectedSocialName ? `Vibe: ${selectedSocialName}` : "",
    selectedBudget !== "all" ? `Budget: ${selectedBudget}` : "",
  ].filter(Boolean);

  const resultIntentSummary = useMemo(() => {
    const subject = selectedCategoryName
      ? selectedCategoryName.toLowerCase()
      : "venues";
    const prefix = selectedMoodName
      ? `${selectedMoodName.toLowerCase()} ${subject}`
      : subject;
    const chunks = [prefix];

    if (selectedAreaName) {
      chunks.push(`in ${selectedAreaName}`);
    }

    if (selectedBestForName) {
      chunks.push(`for ${selectedBestForName.toLowerCase()}`);
    }

    if (selectedBudget !== "all") {
      chunks.push(`with ${selectedBudget} budget`);
    }

    if (selectedEnergyName) {
      chunks.push(`(${selectedEnergyName.toLowerCase()})`);
    }

    return chunks.join(" ");
  }, [selectedAreaName, selectedBestForName, selectedBudget, selectedCategoryName, selectedEnergyName, selectedMoodName]);

  const title = query.trim()
    ? dictionary.searchPage.titleForQuery.replace("{query}", query.trim())
    : selectedMoodValue
      ? `${selectedMoodName} mood picks`
    : dictionary.searchPage.titleDefault;

  const buildVenueHref = (slug: string) => {
    const params = new URLSearchParams();
    params.set("from", "search");

    if (selectedCategory) {
      params.set("category", selectedCategory);
    }

    if (selectedMood) {
      params.set("mood", selectedMood);
    }

    if (selectedBudget) {
      params.set("budget", selectedBudget);
    }

    if (selectedArea) {
      params.set("area", selectedArea);
    }

    if (selectedBestFor) {
      params.set("bestFor", selectedBestFor);
    }

    if (selectedTimeOfDay) {
      params.set("time", selectedTimeOfDay);
    }

    if (selectedEnergyLevel) {
      params.set("energy", selectedEnergyLevel);
    }

    if (selectedSpaceType) {
      params.set("space", selectedSpaceType);
    }

    if (selectedSocialLevel) {
      params.set("social", selectedSocialLevel);
    }

    if (query.trim()) {
      params.set("q", query.trim());
    }

    return `/venues/${slug}?${params.toString()}`;
  };

  const handleSearchSubmit = () => {
    navigate(buildUrl());
  };

  const handleCategorySelect = (slug: string) => {
    const nextCategory = selectedCategory === slug ? "" : slug;
    setSelectedCategory(nextCategory);
    navigate(buildUrl({ category: nextCategory }));
  };

  const handleMoodSelect = (mood: string) => {
    const nextMood = selectedMood === mood ? "" : mood;
    setSelectedMood(nextMood);
    navigate(buildUrl({ mood: nextMood }));
  };

  const handleBudgetSelect = (value: string) => {
    setSelectedBudget(value);
    navigate(buildUrl({ budget: value }));
  };

  const handleAreaSelect = (value: string) => {
    const nextArea = selectedArea === value ? "" : value;
    setSelectedArea(nextArea);
    navigate(buildUrl({ area: nextArea }));
  };

  const handleBestForSelect = (value: string) => {
    const nextBestFor = selectedBestFor === value ? "" : value;
    setSelectedBestFor(nextBestFor);
    navigate(buildUrl({ bestFor: nextBestFor }));
  };

  const handleTimeOfDaySelect = (value: string) => {
    const nextTime = selectedTimeOfDay === value ? "" : value;
    setSelectedTimeOfDay(nextTime);
    navigate(buildUrl({ timeOfDay: nextTime }));
  };

  const handleEnergySelect = (value: string) => {
    const nextEnergy = selectedEnergyLevel === value ? "" : value;
    setSelectedEnergyLevel(nextEnergy);
    navigate(buildUrl({ energyLevel: nextEnergy }));
  };

  const handleSpaceSelect = (value: string) => {
    const nextSpace = selectedSpaceType === value ? "" : value;
    setSelectedSpaceType(nextSpace);
    navigate(buildUrl({ spaceType: nextSpace }));
  };

  const handleSocialSelect = (value: string) => {
    const nextSocial = selectedSocialLevel === value ? "" : value;
    setSelectedSocialLevel(nextSocial);
    navigate(buildUrl({ socialLevel: nextSocial }));
  };

  const clearFilters = () => {
    setQuery("");
    setSelectedCategory("");
    setSelectedMood("");
    setSelectedBudget("all");
    setSelectedArea("");
    setSelectedBestFor("");
    setSelectedTimeOfDay("");
    setSelectedEnergyLevel("");
    setSelectedSpaceType("");
    setSelectedSocialLevel("");
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

          {selectedMoodValue ? (
            <p className="bl-search-mood-summary">
              You are exploring the <strong>{selectedMoodName}</strong> mood.
            </p>
          ) : null}

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

            <div>
              <p className="bl-discovery-label">Mood</p>
              <FilterChips
                options={moodOptions}
                selectedValue={selectedMood || undefined}
                onSelect={handleMoodSelect}
              />
            </div>

            <details className="bl-search-advanced-filters">
              <summary>More filters</summary>

              {areaOptions.length > 0 ? (
                <div>
                  <p className="bl-discovery-label">Area</p>
                  <FilterChips
                    options={areaOptions}
                    selectedValue={selectedArea || undefined}
                    onSelect={handleAreaSelect}
                  />
                </div>
              ) : null}

              {bestForOptions.length > 0 ? (
                <div>
                  <p className="bl-discovery-label">Best for</p>
                  <FilterChips
                    options={bestForOptions}
                    selectedValue={selectedBestFor || undefined}
                    onSelect={handleBestForSelect}
                  />
                </div>
              ) : null}

              <div>
                <p className="bl-discovery-label">Best time</p>
                <FilterChips
                  options={timeOfDayOptions}
                  selectedValue={selectedTimeOfDay || undefined}
                  onSelect={handleTimeOfDaySelect}
                />
              </div>

              <div>
                <p className="bl-discovery-label">Energy</p>
                <FilterChips
                  options={energyOptions}
                  selectedValue={selectedEnergyLevel || undefined}
                  onSelect={handleEnergySelect}
                />
              </div>

              <div>
                <p className="bl-discovery-label">Space</p>
                <FilterChips
                  options={spaceTypeOptions}
                  selectedValue={selectedSpaceType || undefined}
                  onSelect={handleSpaceSelect}
                />
              </div>

              <div>
                <p className="bl-discovery-label">Social vibe</p>
                <FilterChips
                  options={socialLevelOptions}
                  selectedValue={selectedSocialLevel || undefined}
                  onSelect={handleSocialSelect}
                />
              </div>
            </details>

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

              <button
                type="button"
                className="bl-search-clear-btn"
                onClick={() => navigate(buildMapUrl())}
              >
                {dictionary.header.map}
              </button>
            </div>
          </div>

          <div className="bl-search-params">
            <p>
              You are viewing <span>{resultIntentSummary}</span>
            </p>
            <p>
              {dictionary.searchPage.summaryQuery}: <span>{query || "—"}</span>
            </p>
            <p>
              {dictionary.searchPage.summaryCategory}: <span>{selectedCategoryName || "—"}</span>
            </p>
            <p>
              Mood: <span>{selectedMoodName || "—"}</span>
            </p>
            <p>
              Area: <span>{selectedAreaName || "—"}</span>
            </p>
            <p>
              Best for: <span>{selectedBestForName || "—"}</span>
            </p>
            <p>
              Time: <span>{selectedTimeOfDayName || "—"}</span>
            </p>
            <p>
              Energy: <span>{selectedEnergyName || "—"}</span>
            </p>
            <p>
              Space: <span>{selectedSpaceName || "—"}</span>
            </p>
            <p>
              Social vibe: <span>{selectedSocialName || "—"}</span>
            </p>
            <p>
              {dictionary.searchPage.summaryBudget}: <span>{selectedBudget === "all" ? dictionary.searchPage.budgetAll : selectedBudget}</span>
            </p>
            <p>
              {filteredVenues.length} {dictionary.searchPage.resultsLabel}
            </p>

            {activeFilterLabels.length > 0 ? (
              <div className="bl-search-active-filters">
                {activeFilterLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            ) : null}
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
                  personality={{
                    bestForTags: venue.bestForTags,
                    timeOfDay: venue.timeOfDay,
                    energyLevel: venue.energyLevel,
                    socialLevel: venue.socialLevel,
                    spaceType: venue.spaceType,
                  }}
                  whyChips={explainVenueMatch(venue, {
                    query,
                    category: selectedCategory || undefined,
                    budget: selectedBudget,
                    mood: selectedMoodValue,
                  })}
                  href={buildVenueHref(venue.slug)}
                  isFavorite={isFavorite(venue.slug)}
                  onToggleFavorite={toggleFavorite}
                  showCollectionPicker
                  showCompareToggle
                  labels={dictionary.venueCard}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="bl-search-empty">
            <h2 className="bl-search-empty-title">{dictionary.searchPage.emptyTitle}</h2>
            <p className="bl-search-empty-description">
              No exact match found for your current filters. Try clearing one or two filters, or
              switch to a broader mood/area.
            </p>
            <div className="bl-search-empty-actions">
              <button type="button" className="bl-search-clear-btn" onClick={clearFilters}>
                Reset all filters
              </button>
              <button
                type="button"
                className="bl-search-clear-btn"
                onClick={() => navigate(buildMapUrl())}
              >
                View on map
              </button>
            </div>
            <Link to="/" className="bl-search-back-link">
              ← {dictionary.recommendationsPage.backHome}
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
