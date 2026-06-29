import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { BudgetSelector } from "../components/discovery/BudgetSelector";
import { FilterChips } from "../components/discovery/FilterChips";
import { SearchBar } from "../components/discovery/SearchBar";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueCard, VenueCardSkeleton } from "../components/home/VenueCard";
import { categories, getVenueDisplay } from "../data/mockData";
import { useFavorites } from "../hooks/useFavorites";
import { usePageMeta } from "../hooks/usePageMeta";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import { getFlowTexts } from "../i18n/flowTexts";
import {
  getDiscoveryMoodLabel,
  isDiscoveryMood,
} from "../utils/discoveryInsights";
import {
  filterVenuesBySmartDiscovery,
  getAreaOptions,
  getBestForLabelByLanguage,
  getBestForOptions,
  getEnergyOptions,
  getSearchFallbackSuggestions,
  getSocialLevelOptions,
  getSpaceTypeOptions,
  getTimeOfDayOptions,
  type SearchSuggestion,
} from "../utils/discoveryFilters";
import { getVenueImageSrc } from "../utils/venueImage";
import "./SearchPage.css";

export default function SearchPage() {
  const { dictionary, language } = useI18n();
  const text = getFlowTexts(language);
  const moodLabels = getDiscoveryMoodLabel(language);
  usePageMeta(
    language === "fr"
      ? "Découvrir des lieux à Casablanca | Blaniko"
      : "Discover venues in Casablanca | Blaniko",
    language === "fr"
      ? "Recherchez et filtrez des activités, lieux et expériences à Casablanca."
      : "Search and filter activities, venues, and experiences in Casablanca.",
  );
  const navigate = useNavigate();
  const { venues, isLoading, error, retry } = useVenues();
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  const moodOptions = useMemo(
    () => [
      { value: "chill", label: moodLabels.chill },
      { value: "social", label: moodLabels.social },
      { value: "active", label: moodLabels.active },
      { value: "romantic", label: moodLabels.romantic },
      { value: "family-friendly", label: moodLabels["family-friendly"] },
    ],
    [moodLabels],
  );

  const quickFilters = useMemo(
    () =>
      categories
        .filter((category) =>
          ["activities", "sports", "gaming", "outdoor", "family"].includes(
            category.slug,
          ),
        )
        .map((category) => ({
          value: category.slug,
          label: dictionary.categoryNames[category.slug] ?? category.name,
        })),
    [dictionary.categoryNames],
  );

  const budgetOptions = [
    { value: "all", label: dictionary.searchPage.budgetAll },
    { value: "$", label: dictionary.searchPage.budgetLow },
    { value: "$$", label: dictionary.searchPage.budgetMid },
    { value: "$$$", label: dictionary.searchPage.budgetHigh },
  ];

  const areaOptions = useMemo(() => getAreaOptions(venues), [venues]);
  const bestForOptions = useMemo(
    () => getBestForOptions(venues, language),
    [language, venues],
  );
  const timeOfDayOptions = useMemo(() => getTimeOfDayOptions(language), [language]);
  const energyOptions = useMemo(() => getEnergyOptions(language), [language]);
  const spaceTypeOptions = useMemo(() => getSpaceTypeOptions(language), [language]);
  const socialLevelOptions = useMemo(() => getSocialLevelOptions(language), [language]);

  const hasAdvancedFilters =
    !!selectedMood ||
    selectedBudget !== "all" ||
    !!selectedArea ||
    !!selectedBestFor ||
    !!selectedTimeOfDay ||
    !!selectedEnergyLevel ||
    !!selectedSpaceType ||
    !!selectedSocialLevel;

  const anyFilterActive =
    hasAdvancedFilters || !!selectedCategory || !!query.trim();

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

    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextCategory) params.set("category", nextCategory);
    if (nextMood) params.set("mood", nextMood);
    if (nextBudget && nextBudget !== "all") params.set("budget", nextBudget);
    if (nextArea) params.set("area", nextArea);
    if (nextBestFor) params.set("bestFor", nextBestFor);
    if (nextTimeOfDay) params.set("time", nextTimeOfDay);
    if (nextEnergy) params.set("energy", nextEnergy);
    if (nextSpaceType) params.set("space", nextSpaceType);
    if (nextSocialLevel) params.set("social", nextSocialLevel);

    const suffix = params.toString();
    return suffix ? `/search?${suffix}` : "/search";
  };

  const buildMapUrl = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedMood) params.set("mood", selectedMood);
    if (selectedBudget !== "all") params.set("budget", selectedBudget);
    if (selectedArea) params.set("area", selectedArea);
    if (selectedBestFor) params.set("bestFor", selectedBestFor);
    if (selectedTimeOfDay) params.set("time", selectedTimeOfDay);
    if (selectedEnergyLevel) params.set("energy", selectedEnergyLevel);
    if (selectedSpaceType) params.set("space", selectedSpaceType);
    if (selectedSocialLevel) params.set("social", selectedSocialLevel);
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
    ],
  );

  const selectedCategoryName = categories.find(
    (category) => category.slug === selectedCategory,
  )?.name;
  const selectedMoodName = moodOptions.find(
    (mood) => mood.value === selectedMood,
  )?.label;

  const title = query.trim()
    ? dictionary.searchPage.titleForQuery.replace("{query}", query.trim())
    : selectedMoodValue
      ? dictionary.searchPage.moodPicksTitle.replace("{mood}", selectedMoodName ?? "")
      : dictionary.searchPage.titleDefault;

  const buildVenueHref = (slug: string) => {
    const params = new URLSearchParams();
    params.set("from", "search");
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedMood) params.set("mood", selectedMood);
    if (selectedBudget) params.set("budget", selectedBudget);
    if (selectedArea) params.set("area", selectedArea);
    if (selectedBestFor) params.set("bestFor", selectedBestFor);
    if (selectedTimeOfDay) params.set("time", selectedTimeOfDay);
    if (selectedEnergyLevel) params.set("energy", selectedEnergyLevel);
    if (selectedSpaceType) params.set("space", selectedSpaceType);
    if (selectedSocialLevel) params.set("social", selectedSocialLevel);
    if (query.trim()) params.set("q", query.trim());
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

  const closeSuggestions = useMemo(
    () =>
      filteredVenues.length === 0 && query.trim()
        ? getSearchFallbackSuggestions(query)
        : [],
    [filteredVenues.length, query],
  );

  const getSuggestionLabel = (s: SearchSuggestion): string => {
    if (s.category) return dictionary.categoryNames[s.category] ?? s.label;
    if (s.bestFor) return getBestForLabelByLanguage(s.bestFor, language);
    return s.label;
  };

  const handleSuggestionClick = (s: SearchSuggestion) => {
    const nextQuery = s.query ?? "";
    const nextCategory = s.category ?? "";
    const nextArea = s.area ?? "";
    const nextBestFor = s.bestFor ?? "";

    setQuery(nextQuery);
    setSelectedCategory(nextCategory);
    setSelectedMood("");
    setSelectedBudget("all");
    setSelectedArea(nextArea);
    setSelectedBestFor(nextBestFor);
    setSelectedTimeOfDay("");
    setSelectedEnergyLevel("");
    setSelectedSpaceType("");
    setSelectedSocialLevel("");

    const params = new URLSearchParams();
    if (nextQuery) params.set("q", nextQuery);
    if (nextCategory) params.set("category", nextCategory);
    if (nextArea) params.set("area", nextArea);
    if (nextBestFor) params.set("bestFor", nextBestFor);
    const suffix = params.toString();
    navigate(suffix ? `/search?${suffix}` : "/search");
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

  /* Popular quick-entry tags shown inside the header. Wired to existing filters. */
  const popularTags: Array<{ label: string; apply: () => void }> = [
    { label: getBestForLabelByLanguage("date-spot", language), apply: () => handleBestForSelect("date-spot") },
    { label: getBestForLabelByLanguage("friends", language), apply: () => handleBestForSelect("friends") },
    { label: dictionary.categoryNames["outdoor"] ?? "Outdoor", apply: () => handleCategorySelect("outdoor") },
    { label: dictionary.searchPage.budgetLow, apply: () => handleBudgetSelect("$") },
    { label: getBestForLabelByLanguage("sunset-spot", language), apply: () => handleBestForSelect("sunset-spot") },
  ];

  const resultsCountLine = selectedCategory
    ? `${dictionary.categoryNames[selectedCategory] ?? selectedCategoryName} · ${filteredVenues.length} ${dictionary.searchPage.resultsLabel}`
    : `${filteredVenues.length} ${dictionary.searchPage.resultsInCity}`;

  return (
    <div className="bl-search-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-search-main">
        {/* ===== Compact search header (no hero) ===== */}
        <section className="bl-search-head">
          <div className="bl-search-head-top">
            <p className="bl-search-eyebrow">
              <svg width="20" height="6" viewBox="0 0 26 8" fill="none" stroke="currentColor"
                strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
                <path d="M1 5c2-3 4-3 6 0s4 3 6 0 4-3 6 0 4 3 6 0" />
              </svg>
              {dictionary.searchPage.eyebrow}
            </p>
            {!isLoading ? (
              <p className="bl-search-head-count">
                {filteredVenues.length}{" "}
                {dictionary.searchPage.curatedPlaces}
              </p>
            ) : null}
          </div>

          <div className="bl-search-head-search">
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={handleSearchSubmit}
              placeholder={dictionary.searchPage.searchPlaceholder}
              submitLabel={dictionary.searchPage.searchAction}
            />
            <div className="bl-search-head-quick">
              {popularTags.map((t) => (
                <button key={t.label} type="button" className="bl-search-head-quick-tag" onClick={t.apply}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Sticky primary filter rail ===== */}
        <div className="bl-search-filter-rail">
          <div className="bl-search-filter-rail-scroll">
            <FilterChips
              options={quickFilters}
              selectedValue={selectedCategory || undefined}
              onSelect={handleCategorySelect}
            />

            <span className="bl-search-filter-sep" aria-hidden="true" />

            <button
              type="button"
              className={`bl-search-more-btn${hasAdvancedFilters ? " has-active" : ""}${showAdvanced ? " is-open" : ""}`}
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
            >
              {text.common.moreFilters}
              {hasAdvancedFilters ? <span className="bl-search-more-dot" aria-hidden="true" /> : null}
            </button>

            {anyFilterActive ? (
              <button type="button" className="bl-search-clear-btn" onClick={clearFilters}>
                {dictionary.searchPage.clearFilters}
              </button>
            ) : null}

            <button
              type="button"
              className="bl-search-map-btn"
              onClick={() => navigate(buildMapUrl())}
            >
              {dictionary.header.map}
            </button>
          </div>
        </div>

        {/* ===== Advanced filters panel ===== */}
        {showAdvanced ? (
          <div className="bl-search-advanced-panel">
            <div className="bl-search-advanced-panel-header">
              <p className="bl-search-advanced-panel-title">{text.common.moreFilters}</p>
              <button
                type="button"
                className="bl-search-advanced-panel-done"
                onClick={() => setShowAdvanced(false)}
              >
                {text.common.done}
              </button>
            </div>

            <div className="bl-search-advanced-filters-grid">
              <div className="bl-search-advanced-group">
                <p className="bl-discovery-label">Budget</p>
                <BudgetSelector
                  options={budgetOptions}
                  selectedValue={selectedBudget}
                  onSelect={handleBudgetSelect}
                />
              </div>

              <div className="bl-search-advanced-group">
                <p className="bl-discovery-label">Mood</p>
                <FilterChips
                  options={moodOptions}
                  selectedValue={selectedMood || undefined}
                  onSelect={handleMoodSelect}
                />
              </div>

              {areaOptions.length > 0 ? (
                <div className="bl-search-advanced-group">
                  <p className="bl-discovery-label">{text.common.area}</p>
                  <FilterChips
                    options={areaOptions}
                    selectedValue={selectedArea || undefined}
                    onSelect={handleAreaSelect}
                  />
                </div>
              ) : null}

              {bestForOptions.length > 0 ? (
                <div className="bl-search-advanced-group">
                  <p className="bl-discovery-label">{text.common.bestFor}</p>
                  <FilterChips
                    options={bestForOptions}
                    selectedValue={selectedBestFor || undefined}
                    onSelect={handleBestForSelect}
                  />
                </div>
              ) : null}

              <div className="bl-search-advanced-group">
                <p className="bl-discovery-label">{text.common.bestTime}</p>
                <FilterChips
                  options={timeOfDayOptions}
                  selectedValue={selectedTimeOfDay || undefined}
                  onSelect={handleTimeOfDaySelect}
                />
              </div>

              <div className="bl-search-advanced-group">
                <p className="bl-discovery-label">{text.common.energy}</p>
                <FilterChips
                  options={energyOptions}
                  selectedValue={selectedEnergyLevel || undefined}
                  onSelect={handleEnergySelect}
                />
              </div>

              <div className="bl-search-advanced-group">
                <p className="bl-discovery-label">{text.common.space}</p>
                <FilterChips
                  options={spaceTypeOptions}
                  selectedValue={selectedSpaceType || undefined}
                  onSelect={handleSpaceSelect}
                />
              </div>

              <div className="bl-search-advanced-group">
                <p className="bl-discovery-label">{text.common.socialVibe}</p>
                <FilterChips
                  options={socialLevelOptions}
                  selectedValue={selectedSocialLevel || undefined}
                  onSelect={handleSocialSelect}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* ===== Results ===== */}
        {isLoading ? (
          <section className="bl-search-results">
            <p className="bl-search-results-count" style={{ opacity: 0.5 }}>
              {dictionary.searchPage.findingPlaces}
            </p>
            <div className="bl-search-venues-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <VenueCardSkeleton key={i} />
              ))}
            </div>
          </section>
        ) : error ? (
          <section className="bl-search-results">
            <p className="bl-api-error">{dictionary.common.apiError}</p>
            <button type="button" className="bl-retry-btn" onClick={retry}>
              {dictionary.common.retry}
            </button>
          </section>
        ) : filteredVenues.length > 0 ? (
          <section className="bl-search-results">
            <div className="bl-search-results-head">
              <div>
                <p className="bl-search-results-count">{resultsCountLine}</p>
                <h2 className="bl-search-results-title">{title}</h2>
              </div>
              <p className="bl-search-results-meta">
                {dictionary.searchPage.handpickedUpdated}
              </p>
            </div>

            <div className="bl-search-venues-grid">
              {filteredVenues.map((venue) => {
                const vd = getVenueDisplay(venue, language);
                return (
                  <VenueCard
                    key={venue.slug}
                    slug={venue.slug}
                    category={dictionary.categoryNames[venue.categorySlug] ?? venue.category}
                    name={venue.name}
                    area={venue.area}
                    description={vd.description}
                    imageUrl={getVenueImageSrc(venue)}
                    priceLevel={venue.priceLevel}
                    personality={{
                      bestForTags: venue.bestForTags,
                      timeOfDay: venue.timeOfDay,
                      energyLevel: venue.energyLevel,
                      socialLevel: venue.socialLevel,
                      spaceType: venue.spaceType,
                    }}
                    href={buildVenueHref(venue.slug)}
                    isFavorite={isFavorite(venue.slug)}
                    onToggleFavorite={toggleFavorite}
                    language={language}
                    labels={dictionary.venueCard}
                  />
                );
              })}
            </div>
          </section>
        ) : (
          <section className="bl-search-empty">
            <span className="bl-search-empty-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
                strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.2-3.2" />
              </svg>
            </span>
            <h2 className="bl-search-empty-title">{dictionary.searchPage.emptyTitle}</h2>
            <p className="bl-search-empty-description">
              {dictionary.searchPage.emptyDescription}
            </p>

            {closeSuggestions.length > 0 ? (
              <div className="bl-search-close-ideas">
                <p className="bl-search-close-ideas-label">
                  {text.searchPage.closeIdeasTitle}
                </p>
                <div className="bl-search-close-ideas-chips">
                  {closeSuggestions.map((s) => (
                    <button
                      key={`${s.query ?? ""}${s.category ?? ""}${s.area ?? ""}${s.bestFor ?? ""}`}
                      type="button"
                      className="bl-search-close-ideas-chip"
                      onClick={() => handleSuggestionClick(s)}
                    >
                      {getSuggestionLabel(s)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="bl-search-empty-actions">
              <button type="button" className="bl-search-clear-btn" onClick={clearFilters}>
                {text.searchPage.resetAllFilters}
              </button>
              <button
                type="button"
                className="bl-search-map-btn"
                onClick={() => navigate(buildMapUrl())}
              >
                {text.searchPage.viewOnMap}
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
