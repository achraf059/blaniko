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
import { formatFlowText, getFlowTexts } from "../i18n/flowTexts";
import {
  explainVenueMatch,
  getDiscoveryMoodLabel,
  isDiscoveryMood,
} from "../utils/discoveryInsights";
import {
  filterVenuesBySmartDiscovery,
  getAreaLabel,
  getAreaOptions,
  getBestForLabelByLanguage,
  getBestForOptions,
  getEnergyOptions,
  getOptionLabel,
  getSocialLevelOptions,
  getSpaceTypeOptions,
  getTimeOfDayOptions,
} from "../utils/discoveryFilters";
import {
  getBestForBadges,
  getVenuePersonalitySignals,
} from "../utils/venuePersonality";
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
      typeof venue.coordinates?.lat === "number" &&
      typeof venue.coordinates?.lng === "number",
  );
}

function normalizeAreaValue(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(", casablanca", "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveAreaFromQuery(
  areaQuery: string,
  options: Array<{ value: string; label: string }>,
): string {
  if (!areaQuery) {
    return "";
  }

  const normalizedQuery = normalizeAreaValue(areaQuery);

  const direct = options.find((option) => option.value === areaQuery);
  if (direct) {
    return direct.value;
  }

  const fromNormalizedValue = options.find(
    (option) => normalizeAreaValue(option.value) === normalizedQuery,
  );
  if (fromNormalizedValue) {
    return fromNormalizedValue.value;
  }

  const fromLabel = options.find(
    (option) => normalizeAreaValue(option.label) === normalizedQuery,
  );
  if (fromLabel) {
    return fromLabel.value;
  }

  return "";
}

export default function MapPage() {
  const { dictionary, language } = useI18n();
  const text = getFlowTexts(language);
  const moodLabels = getDiscoveryMoodLabel(language);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { venues } = useVenues();
  const { isFavorite, toggleFavorite } = useFavorites();

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
  const [selectedBestFor, setSelectedBestFor] = useState(bestForFromUrl);
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState(timeOfDayFromUrl);
  const [selectedEnergyLevel, setSelectedEnergyLevel] = useState(energyFromUrl);
  const [selectedSpaceType, setSelectedSpaceType] = useState(spaceFromUrl);
  const [selectedSocialLevel, setSelectedSocialLevel] = useState(socialFromUrl);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const listRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
          [
            "cafes",
            "restaurants",
            "activities",
            "sports",
            "gaming",
            "outdoor",
          ].includes(category.slug),
        )
        .map((category) => ({ value: category.slug, label: category.name })),
    [],
  );

  const budgetOptions = [
    { value: "all", label: dictionary.mapPage.budgetAll },
    { value: "$", label: dictionary.mapPage.budgetLow },
    { value: "$$", label: dictionary.mapPage.budgetMid },
    { value: "$$$", label: dictionary.mapPage.budgetHigh },
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
  const selectedArea = useMemo(
    () => resolveAreaFromQuery(areaFromUrl, areaOptions),
    [areaFromUrl, areaOptions],
  );

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

    if (nextBudget !== "all") {
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
    return suffix ? `/map?${suffix}` : "/map";
  };

  const selectedMoodValue = isDiscoveryMood(selectedMood)
    ? selectedMood
    : undefined;
  const selectedMoodName = selectedMoodValue
    ? moodLabels[selectedMoodValue]
    : undefined;
  const selectedAreaName = selectedArea
    ? getAreaLabel(selectedArea, areaOptions)
    : undefined;
  const selectedBestForName = selectedBestFor
    ? getBestForLabelByLanguage(selectedBestFor, language)
    : undefined;
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
    selectedMoodName ? `${text.searchPage.summaryMood}: ${selectedMoodName}` : "",
    selectedAreaName ? `${text.searchPage.summaryArea}: ${selectedAreaName}` : "",
    selectedBestForName
      ? `${text.searchPage.summaryBestFor}: ${selectedBestForName}`
      : "",
    selectedTimeOfDayName
      ? `${text.searchPage.summaryTime}: ${selectedTimeOfDayName}`
      : "",
    selectedEnergyName ? `${text.searchPage.summaryEnergy}: ${selectedEnergyName}` : "",
    selectedSpaceName ? `${text.searchPage.summarySpace}: ${selectedSpaceName}` : "",
    selectedSocialName
      ? `${text.searchPage.summarySocialVibe}: ${selectedSocialName}`
      : "",
    selectedBudget !== "all"
      ? `${dictionary.searchPage.summaryBudget}: ${selectedBudget}`
      : "",
  ].filter(Boolean);

  const mapIntentSummary = useMemo(() => {
    const subject = selectedCategory
      ? (categories
          .find((category) => category.slug === selectedCategory)
          ?.name.toLowerCase() ?? (language === "fr" ? "lieux" : "venues"))
      : language === "fr"
        ? "lieux"
        : "venues";
    const chunks = [
      selectedMoodName
        ? `${selectedMoodName.toLowerCase()} ${subject}`
        : subject,
    ];

    if (selectedAreaName) {
      chunks.push(
        language === "fr" ? `à ${selectedAreaName}` : `in ${selectedAreaName}`,
      );
    }

    if (selectedBestForName) {
      chunks.push(
        language === "fr"
          ? `pour ${selectedBestForName.toLowerCase()}`
          : `for ${selectedBestForName.toLowerCase()}`,
      );
    }

    return chunks.join(" ");
  }, [
    language,
    selectedAreaName,
    selectedBestForName,
    selectedCategory,
    selectedMoodName,
  ]);

  const buildVenueHref = (slug: string) => {
    const params = new URLSearchParams();
    params.set("from", "map");

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

  const mapVenues = useMemo(
    () => toMappedVenues(filteredVenues),
    [filteredVenues],
  );

  const activeSlug =
    selectedSlug && mapVenues.some((venue) => venue.slug === selectedSlug)
      ? selectedSlug
      : (mapVenues[0]?.slug ?? null);

  const selectedVenue =
    mapVenues.find((venue) => venue.slug === activeSlug) ?? null;

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

    const latRange = Math.max(
      coordinatesBounds.maxLat - coordinatesBounds.minLat,
      0.0001,
    );
    const lngRange = Math.max(
      coordinatesBounds.maxLng - coordinatesBounds.minLng,
      0.0001,
    );

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
    setSelectedBestFor("");
    setSelectedTimeOfDay("");
    setSelectedEnergyLevel("");
    setSelectedSpaceType("");
    setSelectedSocialLevel("");
    navigate("/map");
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

          {selectedMoodName ? (
            <p className="bl-map-mood-summary">
              {formatFlowText(text.searchPage.mapFilteredFor, {
                mood: selectedMoodName,
              })}
            </p>
          ) : null}

          <p className="bl-map-intent-summary">
            {text.common.viewing} <strong>{mapIntentSummary}</strong>
          </p>

          {activeFilterLabels.length > 0 ? (
            <div className="bl-map-active-filters">
              {activeFilterLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          ) : null}

          <div className="bl-map-controls">
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={handleSearchSubmit}
              placeholder={dictionary.mapPage.searchPlaceholder}
              submitLabel={dictionary.mapPage.searchAction}
            />

            <div>
              <p className="bl-discovery-label">
                {dictionary.mapPage.quickFiltersLabel}
              </p>
              <FilterChips
                options={quickFilters}
                selectedValue={selectedCategory || undefined}
                onSelect={handleCategorySelect}
              />
            </div>

            <div>
              <p className="bl-discovery-label">{text.common.mood}</p>
              <FilterChips
                options={moodOptions}
                selectedValue={selectedMood || undefined}
                onSelect={handleMoodSelect}
              />
            </div>

            <details className="bl-map-advanced-filters">
              <summary>{text.common.moreFilters}</summary>

              {areaOptions.length > 0 ? (
                <div>
                  <p className="bl-discovery-label">{text.common.area}</p>
                  <FilterChips
                    options={areaOptions}
                    selectedValue={selectedArea || undefined}
                    onSelect={handleAreaSelect}
                  />
                </div>
              ) : null}

              {bestForOptions.length > 0 ? (
                <div>
                  <p className="bl-discovery-label">{text.common.bestFor}</p>
                  <FilterChips
                    options={bestForOptions}
                    selectedValue={selectedBestFor || undefined}
                    onSelect={handleBestForSelect}
                  />
                </div>
              ) : null}

              <div>
                <p className="bl-discovery-label">{text.common.bestTime}</p>
                <FilterChips
                  options={timeOfDayOptions}
                  selectedValue={selectedTimeOfDay || undefined}
                  onSelect={handleTimeOfDaySelect}
                />
              </div>

              <div>
                <p className="bl-discovery-label">{text.common.energy}</p>
                <FilterChips
                  options={energyOptions}
                  selectedValue={selectedEnergyLevel || undefined}
                  onSelect={handleEnergySelect}
                />
              </div>

              <div>
                <p className="bl-discovery-label">{text.common.space}</p>
                <FilterChips
                  options={spaceTypeOptions}
                  selectedValue={selectedSpaceType || undefined}
                  onSelect={handleSpaceSelect}
                />
              </div>

              <div>
                <p className="bl-discovery-label">{text.common.socialVibe}</p>
                <FilterChips
                  options={socialLevelOptions}
                  selectedValue={selectedSocialLevel || undefined}
                  onSelect={handleSocialSelect}
                />
              </div>
            </details>

            <div>
              <p className="bl-discovery-label">
                {dictionary.mapPage.budgetLabel}
              </p>
              <BudgetSelector
                options={budgetOptions}
                selectedValue={selectedBudget}
                onSelect={handleBudgetSelect}
              />
            </div>

            <button
              type="button"
              className="bl-map-clear-btn"
              onClick={clearFilters}
            >
              {text.common.clearAllFilters}
            </button>
          </div>
        </section>

        <section className="bl-map-layout">
          <div className="bl-map-panel">
            <div className="bl-map-panel-head">
              <h2>{dictionary.mapPage.mapTitle}</h2>
              <p>{mapVenues.length}</p>
            </div>

            {mapVenues.length > 0 ? (
              <div
                className="bl-map-canvas"
                role="application"
                aria-label={dictionary.mapPage.mapTitle}
              >
                <div className="bl-map-watermark">{text.searchPage.casablancaWatermark}</div>

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
                <p>
                  {text.searchPage.noExactMapDescription}
                </p>
                <button
                  type="button"
                  className="bl-map-clear-btn"
                  onClick={clearFilters}
                >
                  {text.common.resetFilters}
                </button>
              </div>
            )}

            {selectedVenue ? (
              <article className="bl-map-preview">
                {(() => {
                  const badges = getBestForBadges(selectedVenue, 3, language);
                  const signals = getVenuePersonalitySignals(selectedVenue, language);

                  return (
                    <>
                      <div className="bl-map-preview-top">
                        <p className="bl-map-preview-category">
                          {selectedVenue.category}
                        </p>
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

                      <h3 className="bl-map-preview-name">
                        {selectedVenue.name}
                      </h3>
                      <p className="bl-map-preview-area">
                        📍 {selectedVenue.area}
                      </p>
                      <p className="bl-map-preview-description">
                        {selectedVenue.shortDescription ??
                          selectedVenue.description}
                      </p>

                      {badges.length > 0 ? (
                        <div className="bl-map-badges-list">
                          {badges.map((badge, index) => (
                            <span
                              key={`${selectedVenue.slug}-preview-${badge}-${index}`}
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {signals.length > 0 ? (
                        <p className="bl-map-signals-line">
                          {signals.join(" • ")}
                        </p>
                      ) : null}

                      <div className="bl-map-why-list">
                        {explainVenueMatch(selectedVenue, {
                          query,
                          category: selectedCategory || undefined,
                          budget: selectedBudget,
                          mood: selectedMoodValue,
                        }, 3, language).map((chip) => (
                          <span key={chip} className="bl-map-why-chip">
                            {chip}
                          </span>
                        ))}
                      </div>

                      <Link
                        to={buildVenueHref(selectedVenue.slug)}
                        className="bl-map-preview-link"
                      >
                        {dictionary.mapPage.viewDetails} →
                      </Link>
                    </>
                  );
                })()}
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
                const badges = getBestForBadges(venue, 2, language);
                return (
                  <div
                    key={venue.slug}
                    ref={(node) => {
                      listRefs.current[venue.slug] = node;
                    }}
                    className={`bl-map-list-item${isActive ? " is-active" : ""}`}
                  >
                    <div className="bl-map-list-item-top">
                      <p className="bl-map-list-item-category">
                        {venue.category}
                      </p>
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

                    {badges.length > 0 ? (
                      <div className="bl-map-badges-list">
                        {badges.map((badge, index) => (
                          <span key={`${venue.slug}-list-${badge}-${index}`}>
                            {badge}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="bl-map-why-list">
                      {explainVenueMatch(venue, {
                        query,
                        category: selectedCategory || undefined,
                        budget: selectedBudget,
                        mood: selectedMoodValue,
                      }, 3, language).map((chip) => (
                        <span key={chip} className="bl-map-why-chip">
                          {chip}
                        </span>
                      ))}
                    </div>

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

                      <Link
                        to={buildVenueHref(venue.slug)}
                        className="bl-map-list-link"
                      >
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
