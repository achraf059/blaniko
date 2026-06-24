import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

const LeafletMap = lazy(() =>
  import("../components/map/LeafletMap").then((mod) => ({ default: mod.LeafletMap }))
);
import { BudgetSelector } from "../components/discovery/BudgetSelector";
import { FilterChips } from "../components/discovery/FilterChips";
import { SearchBar } from "../components/discovery/SearchBar";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueImage } from "../components/home/VenueImage";
import { categories, getVenueDisplay, type Venue } from "../data/mockData";
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
  getBestForOptions,
  getEnergyOptions,
  getSocialLevelOptions,
  getSpaceTypeOptions,
  getTimeOfDayOptions,
} from "../utils/discoveryFilters";
import { getBestForBadges } from "../utils/venuePersonality";
import { getVenueImageSrc } from "../utils/venueImage";
import "./MapPage.css";

type MappedVenue = Venue & {
  coordinates: {
    lat: number;
    lng: number;
  };
};

// ─── Coordinates data plan ────────────────────────────────────────────────────
//
// Real map rendering requires lat/lng on every venue. Here is what is needed:
//
// 1. Supabase `venues` table — add two nullable columns:
//      lat  DOUBLE PRECISION  (e.g. 33.5731)
//      lng  DOUBLE PRECISION  (e.g. -7.5898)
//    Casablanca bounding box: lat 33.46–33.66, lng -7.75–-7.45
//
// 2. frontend/src/data/mockData.ts — `Venue` type already has:
//      coordinates?: { lat: number; lng: number }
//    No frontend type change needed.
//
// 3. backend/src/routes/venues.ts `mapVenue()` — add coordinates mapping:
//      coordinates: typeof row.lat === 'number' && typeof row.lng === 'number'
//        ? { lat: row.lat as number, lng: row.lng as number }
//        : undefined,
//    (this has been added — see venues.ts)
//
// Until Supabase rows have lat/lng values, mapVenues will be empty and the
// map canvas will show the "no results" placeholder. The list panel below
// intentionally shows ALL filtered venues regardless of coordinates so the
// page remains usable as a location/venue browser.
// ─────────────────────────────────────────────────────────────────────────────

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
  if (!areaQuery) return "";
  const normalizedQuery = normalizeAreaValue(areaQuery);
  const direct = options.find((option) => option.value === areaQuery);
  if (direct) return direct.value;
  const fromNormalizedValue = options.find(
    (option) => normalizeAreaValue(option.value) === normalizedQuery,
  );
  if (fromNormalizedValue) return fromNormalizedValue.value;
  const fromLabel = options.find(
    (option) => normalizeAreaValue(option.label) === normalizedQuery,
  );
  if (fromLabel) return fromLabel.value;
  return "";
}

export default function MapPage() {
  const { dictionary, language } = useI18n();
  const text = getFlowTexts(language);
  const moodLabels = getDiscoveryMoodLabel(language);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  usePageMeta(
    language === "fr" ? "Carte | Blaniko" : "Map | Blaniko",
  );
  const { venues, isLoading, error } = useVenues();
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
  const [showAdv, setShowAdv] = useState(false);

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

  // Advanced filter active indicator (dot on the "More filters" button)
  const hasAdv = !!(
    selectedArea ||
    selectedBestFor ||
    selectedTimeOfDay ||
    selectedEnergyLevel ||
    selectedSpaceType ||
    selectedSocialLevel
  );
  const anyActive =
    hasAdv ||
    !!selectedCategory ||
    !!selectedMood ||
    selectedBudget !== "all" ||
    !!query.trim();

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
    if (nextBudget !== "all") params.set("budget", nextBudget);
    if (nextArea) params.set("area", nextArea);
    if (nextBestFor) params.set("bestFor", nextBestFor);
    if (nextTimeOfDay) params.set("time", nextTimeOfDay);
    if (nextEnergy) params.set("energy", nextEnergy);
    if (nextSpaceType) params.set("space", nextSpaceType);
    if (nextSocialLevel) params.set("social", nextSocialLevel);

    const suffix = params.toString();
    return suffix ? `/map?${suffix}` : "/map";
  };

  const buildVenueHref = (slug: string) => {
    const params = new URLSearchParams();
    params.set("from", "map");
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
      query, selectedCategory, selectedMood, selectedBudget, selectedArea,
      selectedBestFor, selectedTimeOfDay, selectedEnergyLevel, selectedSpaceType,
      selectedSocialLevel, venues,
    ],
  );

  const mapVenues = useMemo(() => toMappedVenues(filteredVenues), [filteredVenues]);

  const activeSlug =
    selectedSlug && mapVenues.some((venue) => venue.slug === selectedSlug)
      ? selectedSlug
      : (mapVenues[0]?.slug ?? null);

  const selectedVenue = mapVenues.find((venue) => venue.slug === activeSlug) ?? null;

  const handleSearchSubmit = () => navigate(buildUrl());

  const handleCategorySelect = (slug: string) => {
    const next = selectedCategory === slug ? "" : slug;
    setSelectedCategory(next);
    navigate(buildUrl({ category: next }));
  };
  const handleMoodSelect = (mood: string) => {
    const next = selectedMood === mood ? "" : mood;
    setSelectedMood(next);
    navigate(buildUrl({ mood: next }));
  };
  const handleBudgetSelect = (value: string) => {
    setSelectedBudget(value);
    navigate(buildUrl({ budget: value }));
  };
  const handleAreaSelect = (value: string) => {
    navigate(buildUrl({ area: selectedArea === value ? "" : value }));
  };
  const handleBestForSelect = (value: string) => {
    const next = selectedBestFor === value ? "" : value;
    setSelectedBestFor(next);
    navigate(buildUrl({ bestFor: next }));
  };
  const handleTimeOfDaySelect = (value: string) => {
    const next = selectedTimeOfDay === value ? "" : value;
    setSelectedTimeOfDay(next);
    navigate(buildUrl({ timeOfDay: next }));
  };
  const handleEnergySelect = (value: string) => {
    const next = selectedEnergyLevel === value ? "" : value;
    setSelectedEnergyLevel(next);
    navigate(buildUrl({ energyLevel: next }));
  };
  const handleSpaceSelect = (value: string) => {
    const next = selectedSpaceType === value ? "" : value;
    setSelectedSpaceType(next);
    navigate(buildUrl({ spaceType: next }));
  };
  const handleSocialSelect = (value: string) => {
    const next = selectedSocialLevel === value ? "" : value;
    setSelectedSocialLevel(next);
    navigate(buildUrl({ socialLevel: next }));
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bl-map-page">
      <HomeHeader labels={dictionary.header} />

      <main className="blm-main">

        {/* ── Geographic Discovery Panel (compact 2-column) ─────────────── */}
        <section className="blm-discovery">
          {/* Left: intro */}
          <div className="blm-intro">
            <p className="blm-eyebrow">{dictionary.mapPage.eyebrow}</p>
            <h1 className="blm-intro-title">{dictionary.mapPage.title}</h1>
            <p className="blm-intro-sub">{dictionary.mapPage.subtitle}</p>
            <p className="blm-intro-tip">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              {dictionary.mapPage.helperText}
            </p>
          </div>

          {/* Right: search + chips + foot */}
          <div className="blm-controls">
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={handleSearchSubmit}
              placeholder={dictionary.mapPage.searchPlaceholder}
              submitLabel={dictionary.mapPage.searchAction}
            />

            <div className="blm-filter-rows">
              <div className="blm-filter-block">
                <p className="blm-filter-label">{dictionary.mapPage.quickFiltersLabel}</p>
                <FilterChips
                  options={quickFilters}
                  selectedValue={selectedCategory || undefined}
                  onSelect={handleCategorySelect}
                />
              </div>
              <div className="blm-filter-block">
                <p className="blm-filter-label">{text.common.mood}</p>
                <FilterChips
                  options={moodOptions}
                  selectedValue={selectedMood || undefined}
                  onSelect={handleMoodSelect}
                />
              </div>
            </div>

            <div className="blm-controls-foot">
              <button
                type="button"
                className={`blm-morebtn${hasAdv ? " has-active" : ""}${showAdv ? " is-open" : ""}`}
                onClick={() => setShowAdv((v) => !v)}
                aria-expanded={showAdv}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
                </svg>
                {showAdv ? dictionary.mapPage.lessFilters : text.common.moreFilters}
                {hasAdv && !showAdv ? <span className="blm-adv-dot" aria-hidden="true" /> : null}
              </button>

              <div className="blm-foot-right">
                <div className="blm-foot-budget">
                  <p className="blm-filter-label">{dictionary.mapPage.budgetLabel}</p>
                  <BudgetSelector
                    options={budgetOptions}
                    selectedValue={selectedBudget}
                    onSelect={handleBudgetSelect}
                  />
                </div>
                {anyActive ? (
                  <button type="button" className="blm-clear" onClick={clearFilters}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                    {text.common.clearAllFilters}
                  </button>
                ) : null}
              </div>
            </div>

            {/* Advanced filters drawer */}
            {showAdv ? (
              <div className="blm-advanced">
                {areaOptions.length > 0 ? (
                  <div className="blm-filter-block">
                    <p className="blm-filter-label">{text.common.area}</p>
                    <FilterChips options={areaOptions} selectedValue={selectedArea || undefined} onSelect={handleAreaSelect} />
                  </div>
                ) : null}
                {bestForOptions.length > 0 ? (
                  <div className="blm-filter-block">
                    <p className="blm-filter-label">{text.common.bestFor}</p>
                    <FilterChips options={bestForOptions} selectedValue={selectedBestFor || undefined} onSelect={handleBestForSelect} />
                  </div>
                ) : null}
                <div className="blm-filter-block">
                  <p className="blm-filter-label">{text.common.bestTime}</p>
                  <FilterChips options={timeOfDayOptions} selectedValue={selectedTimeOfDay || undefined} onSelect={handleTimeOfDaySelect} />
                </div>
                <div className="blm-filter-block">
                  <p className="blm-filter-label">{text.common.energy}</p>
                  <FilterChips options={energyOptions} selectedValue={selectedEnergyLevel || undefined} onSelect={handleEnergySelect} />
                </div>
                <div className="blm-filter-block">
                  <p className="blm-filter-label">{text.common.space}</p>
                  <FilterChips options={spaceTypeOptions} selectedValue={selectedSpaceType || undefined} onSelect={handleSpaceSelect} />
                </div>
                <div className="blm-filter-block">
                  <p className="blm-filter-label">{text.common.socialVibe}</p>
                  <FilterChips options={socialLevelOptions} selectedValue={selectedSocialLevel || undefined} onSelect={handleSocialSelect} />
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* ── 62/38 main layout ────────────────────────────────────────────── */}
        <div className="blm-layout">

          {/* ── Map column ─────────────────────────────────────────────────── */}
          <div className="blm-mapcol">
            <div className="blm-panel-head">
              <h2 className="blm-panel-title">{dictionary.mapPage.mapTitle}</h2>
              <span className="blm-count">
                {isLoading
                  ? "—"
                  : <>{filteredVenues.length}&thinsp;{dictionary.mapPage.venues}</>}
              </span>
            </div>

            <div className="blm-mapcard">
              {isLoading ? (
                /* ── Loading state ── */
                <div className="blm-map-status blm-map-loading" aria-live="polite">
                  <span className="blm-map-status-icon" aria-hidden="true">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  </span>
                  <p className="blm-map-status-text">{dictionary.mapPage.loading}</p>
                </div>
              ) : error ? (
                /* ── API error state ── */
                <div className="blm-map-status blm-map-empty">
                  <span className="blm-map-empty-mark" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                    </svg>
                  </span>
                  <h3>{dictionary.mapPage.errorTitle}</h3>
                  <p>{dictionary.mapPage.errorDescription}</p>
                </div>
              ) : mapVenues.length > 0 ? (
                /* ── Map with pins ── */
                <Suspense fallback={
                  <div className="blm-map-status blm-map-loading" aria-live="polite">
                    <span className="blm-map-status-icon" aria-hidden="true">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                    </span>
                    <p className="blm-map-status-text">{dictionary.mapPage.loading}</p>
                  </div>
                }>
                  <LeafletMap
                    venues={mapVenues}
                    activeSlug={activeSlug}
                    onSelectVenue={(slug) => handleSelectVenue(slug, true)}
                    buildVenueHref={buildVenueHref}
                    viewDetailsLabel={dictionary.mapPage.viewDetails}
                  />
                </Suspense>
              ) : filteredVenues.length === 0 ? (
                /* ── Filters produced no results ── */
                <div className="blm-map-empty">
                  <span className="blm-map-empty-mark" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" />
                    </svg>
                  </span>
                  <h3>{dictionary.mapPage.emptyTitle}</h3>
                  <p>{dictionary.mapPage.emptyDescription}</p>
                  {anyActive ? (
                    <button type="button" className="blm-cta" onClick={clearFilters}>
                      {text.common.resetFilters}
                    </button>
                  ) : null}
                </div>
              ) : (
                /* ── Venues exist but none have coordinates yet ── */
                <div className="blm-map-status blm-map-nocoords">
                  <span className="blm-map-status-icon" aria-hidden="true">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" />
                    </svg>
                  </span>
                  <h3 className="blm-map-status-title">{dictionary.mapPage.noCoordsTitle}</h3>
                  <p className="blm-map-status-text">{dictionary.mapPage.noCoordsDescription}</p>
                </div>
              )}
            </div>

            {/* Selected venue preview card */}
            {selectedVenue ? (() => {
              const vd = getVenueDisplay(selectedVenue, language);
              const badges = getBestForBadges(selectedVenue, 3, language);
              const categoryLabel =
                dictionary.categoryNames[selectedVenue.categorySlug] ?? selectedVenue.category;
              const primaryArea = selectedVenue.area.split(",")[0].trim();

              return (
                <article className="blm-preview" key={selectedVenue.slug}>
                  <div className="blm-preview-thumb">
                    <VenueImage
                      src={getVenueImageSrc(selectedVenue)}
                      alt={selectedVenue.name}
                      categorySlug={selectedVenue.categorySlug}
                      category={selectedVenue.category}
                      name={selectedVenue.name}
                      aspectRatio="auto"
                    />
                    <span className="blm-preview-badge">{dictionary.mapPage.selectedLabel}</span>
                  </div>

                  <div className="blm-preview-body">
                    <p className="blm-preview-cat">{categoryLabel}</p>
                    <h3 className="blm-preview-name">{selectedVenue.name}</h3>
                    <p className="blm-preview-area">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" />
                      </svg>
                      {primaryArea}
                      {selectedVenue.priceLevel ? ` · ${selectedVenue.priceLevel}` : ""}
                    </p>
                    <p className="blm-preview-desc">
                      {vd.shortDescription ?? vd.description}
                    </p>
                    {badges.length > 0 ? (
                      <div className="blm-preview-tags">
                        {badges.map((badge, i) => (
                          <span key={i} className="blm-tag">{badge}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="blm-preview-actions">
                    <Link
                      to={buildVenueHref(selectedVenue.slug)}
                      className="blm-cta"
                    >
                      {dictionary.mapPage.viewDetails}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </Link>
                    <button
                      type="button"
                      className={`blm-icon-btn${isFavorite(selectedVenue.slug) ? " is-active" : ""}`}
                      onClick={() => toggleFavorite(selectedVenue.slug)}
                      aria-pressed={isFavorite(selectedVenue.slug)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={isFavorite(selectedVenue.slug) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
                      </svg>
                      {isFavorite(selectedVenue.slug)
                        ? dictionary.venueCard.removeFavorite
                        : dictionary.venueCard.saveFavorite}
                    </button>
                  </div>
                </article>
              );
            })() : null}
          </div>

          {/* ── Venue list column ──────────────────────────────────────────── */}
          <div className="blm-listcol">
            <div className="blm-panel-head">
              <h2 className="blm-panel-title">{dictionary.mapPage.listTitle}</h2>
              <span className="blm-count">{isLoading ? "—" : filteredVenues.length}</span>
            </div>

            <div className="blm-list">
              {isLoading ? (
                <div className="blm-list-loading" aria-live="polite">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" className="blm-spin">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  <p>{dictionary.mapPage.loading}</p>
                </div>
              ) : error ? (
                <div className="blm-list-empty">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                  </svg>
                  <p>{dictionary.mapPage.errorTitle}</p>
                </div>
              ) : filteredVenues.length > 0 ? filteredVenues.map((venue) => {
                const isActive = activeSlug === venue.slug;
                const hasCoords =
                  typeof venue.coordinates?.lat === "number" &&
                  typeof venue.coordinates?.lng === "number";
                const badges = getBestForBadges(venue, 2, language);
                const categoryLabel =
                  dictionary.categoryNames[venue.categorySlug] ?? venue.category;
                const primaryArea = venue.area.split(",")[0].trim();

                return (
                  <div
                    key={venue.slug}
                    ref={(node) => { listRefs.current[venue.slug] = node; }}
                    className={`blm-vcard${isActive ? " is-active" : ""}`}
                    onClick={() => handleSelectVenue(venue.slug, false)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectVenue(venue.slug, false);
                      }
                    }}
                  >
                    <div className="blm-vthumb">
                      <VenueImage
                        src={getVenueImageSrc(venue)}
                        alt={venue.name}
                        categorySlug={venue.categorySlug}
                        category={venue.category}
                        name={venue.name}
                        aspectRatio="auto"
                      />
                    </div>

                    <div className="blm-vbody">
                      <div className="blm-vtop">
                        <p className="blm-vcat">
                          {categoryLabel}
                          {venue.priceLevel ? ` · ${venue.priceLevel}` : ""}
                        </p>
                        {isActive ? (
                          <span className="blm-vsel">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                              <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" />
                            </svg>
                            {dictionary.mapPage.selectedLabel}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="blm-vname">{venue.name}</h3>
                      <p className="blm-varea">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" />
                        </svg>
                        {primaryArea}
                      </p>

                      {badges.length > 0 ? (
                        <div className="blm-vtags">
                          {badges.map((badge, i) => (
                            <span key={i} className="blm-tag">{badge}</span>
                          ))}
                        </div>
                      ) : null}

                      <div className="blm-vfoot">
                        {hasCoords ? (
                          <button
                            type="button"
                            className="blm-vshow"
                            onClick={(e) => { e.stopPropagation(); handleSelectVenue(venue.slug, false); }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" />
                            </svg>
                            {dictionary.mapPage.showOnMap}
                          </button>
                        ) : <span />}

                        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                          <Link
                            to={buildVenueHref(venue.slug)}
                            className="blm-vlink"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {dictionary.mapPage.viewDetails}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M5 12h14M13 6l6 6-6 6" />
                            </svg>
                          </Link>
                          <button
                            type="button"
                            className={`blm-vfav${isFavorite(venue.slug) ? " is-active" : ""}`}
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(venue.slug); }}
                            aria-pressed={isFavorite(venue.slug)}
                            aria-label={isFavorite(venue.slug) ? dictionary.venueCard.removeFavorite : dictionary.venueCard.saveFavorite}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill={isFavorite(venue.slug) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="blm-list-empty">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" />
                  </svg>
                  <p>{dictionary.mapPage.emptyTitle}</p>
                  <button type="button" className="blm-clear" onClick={clearFilters}>
                    {text.common.resetFilters}
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
