import { useState, useMemo, useCallback } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueCard, VenueCardSkeleton } from "../components/home/VenueCard";
import { categories, getVenueDisplay } from "../data/mockData";
import { getBestForTagLabel } from "../data/bestForTags";
import { useFavorites } from "../hooks/useFavorites";
import { usePageMeta } from "../hooks/usePageMeta";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import { getVenueImageSrc, hasVenueImage } from "../utils/venueImage";
import type { Venue } from "../data/mockData";
import type { AppLanguage } from "../i18n/types";
import "./CategoryPage.css";

/* ---------- Category cover images ---------- */
const CATEGORY_IMAGES: Record<string, string> = {
  activities: "/category-images/generated/category-indoor-activities-01.webp",
  sports:     "/category-images/sports-play/category-sports-play-01.webp",
  gaming:     "/category-images/generated/category-gaming-arcades-01.webp",
  family:     "/category-images/family-days/category-family-days-01.webp",
  outdoor:    "/category-images/outdoor-escapes/category-outdoor-escapes-01.webp",
};

/* ---------- Subcategory chips ---------- */
type SubcatChip = {
  key: string;
  labels: Record<AppLanguage, string>;
  /** Lowercase keywords matched against venue text fields */
  terms: string[];
  /** Optional spaceType shortcut — also counts as a match */
  spaceType?: "outdoor" | "indoor" | "mixed";
};

const ACTIVITIES_CHIPS: SubcatChip[] = [
  {
    key: "pool",
    labels: { en: "Pool / Billiards", fr: "Billard" },
    terms: ["pool", "billiards", "snooker", "billard", "pool table"],
  },
  {
    key: "escape-rooms",
    labels: { en: "Escape Rooms", fr: "Escape Games" },
    terms: ["escape room", "escape game", "salle d'escape", "escape"],
  },
  {
    key: "karting",
    labels: { en: "Karting", fr: "Karting" },
    terms: ["karting", "go kart", "go-kart", "kart"],
  },
  {
    key: "bowling",
    labels: { en: "Bowling", fr: "Bowling" },
    terms: ["bowling"],
  },
  {
    key: "gaming",
    labels: { en: "Gaming", fr: "Gaming" },
    terms: ["gaming", "arcade", "console", "esport"],
  },
  {
    key: "outdoor",
    labels: { en: "Outdoor", fr: "Plein air" },
    terms: ["outdoor", "open-air"],
    spaceType: "outdoor",
  },
  {
    key: "family",
    labels: { en: "Family", fr: "Famille" },
    terms: ["family", "kids", "children", "famille", "enfants"],
  },
];

/** Categories that expose subcategory chip rows — extend here to add chips to other pages */
const SUBCATEGORY_CHIPS: Record<string, SubcatChip[]> = {
  activities: ACTIVITIES_CHIPS,
};

/** Returns true if the venue matches the given subcategory chip */
function venueMatchesSubcat(venue: Venue, chip: SubcatChip): boolean {
  const haystack = [
    venue.name ?? "",
    venue.description ?? "",
    venue.shortDescription ?? "",
    venue.audience ?? "",
    venue.vibe ?? "",
    venue.overview ?? "",
    venue.subcategory ?? "",
    ...(venue.searchKeywords ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return (
    chip.terms.some((t) => haystack.includes(t)) ||
    (chip.spaceType != null && venue.spaceType === chip.spaceType)
  );
}

/* ---------- Inline icons ---------- */
function CIcon({ name, size = 16, stroke = 1.7 }: { name: string; size?: number; stroke?: number }) {
  const p: React.SVGProps<SVGSVGElement> = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor",
    strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round",
  };
  switch (name) {
    case "back":     return <svg {...p}><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></svg>;
    case "search":   return <svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>;
    case "chev":     return <svg {...p}><path d="m6 9 6 6 6-6" /></svg>;
    case "pin":      return <svg {...p}><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" /></svg>;
    case "clock":    return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "sliders":  return <svg {...p}><path d="M4 6h11" /><path d="M19 6h1" /><circle cx="17" cy="6" r="2" /><path d="M4 12h3" /><path d="M11 12h9" /><circle cx="9" cy="12" r="2" /><path d="M4 18h11" /><path d="M19 18h1" /><circle cx="17" cy="18" r="2" /></svg>;
    case "grid":     return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case "list":     return <svg {...p}><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3.5 6h0M3.5 12h0M3.5 18h0" /></svg>;
    case "x":        return <svg {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>;
    case "arrow":    return <svg {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>;
    case "star":     return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.7 5.9 6.3.6-4.7 4.3 1.3 6.2L12 16.9 6.1 19.5l1.3-6.2L2.7 9l6.3-.6z" /></svg>;
    case "spark":    return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6z" opacity="0.95" /><path d="M19 14l.8 2.6L22 17l-2.2.4L19 20l-.8-2.6L16 17l2.2-.4z" /></svg>;
    case "building": return <svg {...p}><path d="M3 21h18" /><path d="M5 21V5l7-2v18" /><path d="M19 21V9l-7-2" /></svg>;
    case "heart":    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>;
    case "heartFill": return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>;
    default: return null;
  }
}

/* ---------- Featured pick card (top picks section) ---------- */
interface FeaturedCardProps {
  venue: Venue;
  language: AppLanguage;
  isFav: boolean;
  onToggleFav: (slug: string) => void;
  featuredLabel: string;
  exploreLabel: string;
}

function FeaturedCard({ venue, language, isFav, onToggleFav, featuredLabel, exploreLabel }: FeaturedCardProps) {
  const imageUrl = getVenueImageSrc(venue);
  const [imgFailed, setImgFailed] = useState(false);
  const href = `/venues/${venue.slug}?from=category`;
  const vd = getVenueDisplay(venue, language);
  const area = (venue.area?.split(",")[0] ?? "").trim();

  return (
    <Link to={href} className="blc-pick">
      <div className="blc-pick-media">
        <span className="blc-badge">{featuredLabel}</span>
        <button
          type="button"
          className={`blc-fav${isFav ? " active" : ""}`}
          aria-pressed={isFav}
          aria-label={isFav ? "Remove from saved" : "Save venue"}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(venue.slug); }}
        >
          <CIcon name={isFav ? "heartFill" : "heart"} size={14} />
        </button>
        {imageUrl && !imgFailed ? (
          <img className="blc-media-img" src={imageUrl} alt={venue.name} loading="lazy" onError={() => setImgFailed(true)} />
        ) : (
          <div className="blc-ph">
            <span className="blc-ph-mark">
              <CIcon name="spark" size={18} />
              <span className="blc-ph-word">Blaniko</span>
            </span>
          </div>
        )}
      </div>
      <div className="blc-pick-body">
        <h3 className="blc-pick-name">{venue.name}</h3>
        {area ? <p className="blc-area"><CIcon name="pin" size={11} /> {area}</p> : null}
        <p className="blc-pick-desc">{vd.description}</p>
        <div className="blc-pick-foot">
          <div className="blc-tags">
            {(venue.bestForTags ?? []).slice(0, 3).map((t) => (
              <span key={t} className="blc-tag">{getBestForTagLabel(t, language)}</span>
            ))}
          </div>
          <span className="blc-explore">{exploreLabel} <CIcon name="arrow" size={12} /></span>
        </div>
      </div>
    </Link>
  );
}

/* ---------- Filter state ---------- */
type FilterState = {
  query: string;
  sort: "recommended" | "az";
  area: string;
  goodFor: string;
  time: string;
  /** Subcategory chip key ("all" = no filter) */
  subcat: string;
};

const EMPTY_FILTERS: FilterState = {
  query: "", sort: "recommended", area: "all", goodFor: "all", time: "any", subcat: "all",
};

/* ---------- Filter controls (sidebar + drawer) ---------- */
interface FilterControlsProps {
  f: FilterState;
  set: <K extends keyof FilterState>(k: K, v: FilterState[K]) => void;
  clearAll: () => void;
  areas: string[];
  goodForOptions: string[];
  language: AppLanguage;
  d: ReturnType<typeof useI18n>["dictionary"]["categoryPage"];
  onPlanCta: () => void;
}

function FilterControls({ f, set, clearAll, areas, goodForOptions, language, d, onPlanCta }: FilterControlsProps) {
  return (
    <>
      <div className="blc-field">
        <CIcon name="search" size={15} />
        <input
          type="text"
          value={f.query}
          placeholder={d.searchVenues}
          onChange={(e) => set("query", e.target.value)}
          aria-label={d.searchVenues}
        />
      </div>

      <div className="blc-side-block">
        <div className="blc-side-label">
          <span className="lbl">{d.sortBy}</span>
        </div>
        <div className="blc-select with-icon">
          <span className="lead"><CIcon name="star" size={12} /></span>
          <select value={f.sort} onChange={(e) => set("sort", e.target.value as FilterState["sort"])} aria-label={d.sortBy}>
            <option value="recommended">{d.sortRecommended}</option>
            <option value="az">{d.sortAZ}</option>
          </select>
          <span className="chev"><CIcon name="chev" size={14} /></span>
        </div>
      </div>

      <div className="blc-divider" />

      <div className="blc-side-block">
        <div className="blc-side-label">
          <span className="lbl">{d.filtersLabel}</span>
          <button type="button" className="blc-clear" onClick={clearAll}>{d.clearAll}</button>
        </div>
      </div>

      {areas.length > 1 ? (
        <div className="blc-side-block">
          <div className="blc-side-label">
            <span className="lbl"><CIcon name="pin" size={11} /> {d.locationLabel}</span>
          </div>
          <div className="blc-select">
            <select value={f.area} onChange={(e) => set("area", e.target.value)} aria-label={d.locationLabel}>
              <option value="all">{d.locationAll}</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <span className="chev"><CIcon name="chev" size={14} /></span>
          </div>
        </div>
      ) : null}

      {goodForOptions.length > 0 ? (
        <div className="blc-side-block">
          <div className="blc-side-label">
            <span className="lbl"><CIcon name="heart" size={11} /> {d.goodForLabel}</span>
          </div>
          <div className="blc-pills">
            <button type="button" className={`blc-pill${f.goodFor === "all" ? " active" : ""}`} onClick={() => set("goodFor", "all")}>
              {d.goodForAll}
            </button>
            {goodForOptions.map((tag) => (
              <button key={tag} type="button" className={`blc-pill${f.goodFor === tag ? " active" : ""}`} onClick={() => set("goodFor", tag)}>
                {getBestForTagLabel(tag, language)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="blc-side-block">
        <div className="blc-side-label">
          <span className="lbl"><CIcon name="clock" size={11} /> {d.timeLabel}</span>
        </div>
        <div className="blc-select">
          <select value={f.time} onChange={(e) => set("time", e.target.value)} aria-label={d.timeLabel}>
            <option value="any">{d.timeAny}</option>
            <option value="morning">{d.timeMorning}</option>
            <option value="afternoon">{d.timeAfternoon}</option>
            <option value="evening">{d.timeEvening}</option>
            <option value="late-night">{d.timeLateNight}</option>
          </select>
          <span className="chev"><CIcon name="chev" size={14} /></span>
        </div>
      </div>

      <div className="blc-cta">
        <div className="blc-cta-head">
          <span className="blc-cta-mark"><CIcon name="spark" size={15} /></span>
          <h4 className="blc-cta-title">{d.planCtaTitle}</h4>
        </div>
        <p className="blc-cta-sub">{d.planCtaSub}</p>
        <Link to="/plan" className="blc-cta-btn" onClick={onPlanCta}>
          {d.planCtaBtn} <CIcon name="arrow" size={13} />
        </Link>
      </div>
    </>
  );
}

/* ============================================================
   Category navigation tabs
   ============================================================ */
const NAV_CATEGORIES = ["activities", "sports", "gaming", "outdoor", "family"] as const;

interface CategoryTabsProps {
  activeSlug: string | undefined;
  categoryNames: Record<string, string>;
}

function CategoryTabs({ activeSlug, categoryNames }: CategoryTabsProps) {
  return (
    <nav className="blc-cattabs" aria-label="Browse categories">
      <Link
        to="/categories"
        className={`blc-cattab${!activeSlug ? " active" : ""}`}
        aria-current={!activeSlug ? "page" : undefined}
      >
        {categoryNames["all"] ?? "All"}
      </Link>
      {NAV_CATEGORIES.map((slug) => (
        <Link
          key={slug}
          to={`/categories/${slug}`}
          className={`blc-cattab${activeSlug === slug ? " active" : ""}`}
          aria-current={activeSlug === slug ? "page" : undefined}
        >
          {categoryNames[slug] ?? slug}
        </Link>
      ))}
    </nav>
  );
}

/* ============================================================
   Main component
   ============================================================ */
export default function CategoryPage() {
  const { slug } = useParams();
  const { dictionary, language } = useI18n();
  const { venues, isLoading, error, retry } = useVenues();
  const { isFavorite, toggleFavorite } = useFavorites();
  const d = dictionary.categoryPage;

  /** True when rendering /categories (no slug) — show all venues */
  const isAllMode = slug === undefined;

  /* ---- Read URL params to seed filter state (used by /search redirect) ---- */
  const [searchParams] = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";
  const areaFromUrl = searchParams.get("area") ?? "";
  // Accept both ?goodFor= and ?bestFor= (bestFor is the SearchPage param name)
  const goodForFromUrl = searchParams.get("goodFor") ?? searchParams.get("bestFor") ?? "all";
  const timeFromUrl = searchParams.get("time") ?? "any";

  /* ---- All hooks must come before any conditional return ---- */
  const [f, setF] = useState<FilterState>({
    query: qFromUrl,
    sort: "recommended",
    area: areaFromUrl || "all",
    goodFor: goodForFromUrl || "all",
    time: timeFromUrl || "any",
    subcat: "all",
  });
  const [view, setView] = useState<"grid" | "list">("grid");
  const [drawer, setDrawer] = useState(false);

  const set = useCallback(<K extends keyof FilterState>(k: K, v: FilterState[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
  }, []);
  const clearAll = useCallback(() => setF({ ...EMPTY_FILTERS }), []);

  const category = categories.find((item) => item.slug === slug);
  const heroKey = isAllMode ? "all" : (category?.slug ?? "");
  usePageMeta(
    isAllMode
      ? `Discover Casablanca | Blaniko`
      : category
        ? `${dictionary.categoryNames[category.slug] ?? category.name} in Casablanca | Blaniko`
        : "Category | Blaniko",
    isAllMode ? undefined : category?.description,
  );

  const categoryVenues = useMemo(
    () => isAllMode ? venues : venues.filter((v) => v.categorySlug === slug),
    [venues, slug, isAllMode],
  );

  const picks = useMemo(() => {
    // Only include venues with a confirmed real image so Top Picks never show placeholders.
    // Falls back to all category venues if none have confirmed images.
    const withImages = categoryVenues.filter((v) => hasVenueImage(v));
    const pickPool = withImages.length > 0 ? withImages : categoryVenues;

    // All-mode: pick one venue from each of the primary category groups, preferring
    // non-pool activities so the Top Picks section shows Blaniko's full range.
    if (isAllMode) {
      const poolChip = ACTIVITIES_CHIPS.find((c) => c.key === "pool")!;
      const categoryOrder = ["sports", "gaming", "outdoor", "family", "activities"];
      const seen = new Set<string>();
      const diverse: Venue[] = [];

      // One from each category group — skip pool/billiards for the activities slot
      for (const cat of categoryOrder) {
        if (diverse.length >= 3) break;
        const match = pickPool.find(
          (v) =>
            !seen.has(v.slug) &&
            v.categorySlug === cat &&
            (cat !== "activities" || !venueMatchesSubcat(v, poolChip)),
        );
        if (match) { diverse.push(match); seen.add(match.slug); }
      }

      // Fill any remaining slots with any image venue (allows pool if nothing else exists)
      for (const v of pickPool) {
        if (diverse.length >= 3) break;
        if (!seen.has(v.slug)) { diverse.push(v); seen.add(v.slug); }
      }

      return diverse.slice(0, 3);
    }

    // Activities: curate a diverse set — at most 1 pool/billiards, fill remaining
    // slots from other activity types so Top Picks feel varied.
    if (slug === "activities") {
      const poolChip = ACTIVITIES_CHIPS.find((c) => c.key === "pool")!;
      const otherChips = ACTIVITIES_CHIPS.filter((c) => c.key !== "pool");

      const diverse: Venue[] = [];

      // Allow at most 1 pool venue
      const poolVenue = pickPool.find((v) => venueMatchesSubcat(v, poolChip));
      if (poolVenue) diverse.push(poolVenue);

      // Fill remaining slots with one venue per other type
      for (const chip of otherChips) {
        if (diverse.length >= 3) break;
        const match = pickPool.find(
          (v) => !diverse.includes(v) && venueMatchesSubcat(v, chip),
        );
        if (match) diverse.push(match);
      }

      // Use diverse set only if at least 2 distinct types were found; otherwise fall back
      if (diverse.length >= 2) return diverse.slice(0, 3);
    }

    return pickPool.slice(0, 3);
  }, [categoryVenues, slug, isAllMode]);

  const pickSlugs = useMemo(() => new Set(picks.map((v) => v.slug)), [picks]);

  const areas = useMemo(() => {
    const areaSet = new Set<string>();
    categoryVenues.forEach((v) => {
      const a = (v.area?.split(",")[0] ?? "").trim();
      if (a) areaSet.add(a);
    });
    return Array.from(areaSet).sort();
  }, [categoryVenues]);

  const goodForOptions = useMemo(() => {
    const tagCounts = new Map<string, number>();
    categoryVenues.forEach((v) => {
      (v.bestForTags ?? []).forEach((t) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1));
    });
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([t]) => t);
  }, [categoryVenues]);

  /** Chips defined for this category (null = no chip row) */
  const availableChips = SUBCATEGORY_CHIPS[slug ?? ""] ?? null;

  /** Chips that have at least one matching venue — zero-match chips are hidden */
  const visibleChips = useMemo(() => {
    if (!availableChips) return [];
    return availableChips.filter((chip) =>
      categoryVenues.some((v) => venueMatchesSubcat(v, chip))
    );
  }, [availableChips, categoryVenues]);

  /** Picks narrowed by the active subcategory chip; equals picks when chip is "all" */
  const filteredPicks = useMemo(() => {
    if (f.subcat === "all" || !availableChips) return picks;
    const chip = availableChips.find((c) => c.key === f.subcat);
    if (!chip) return picks;
    return picks.filter((v) => venueMatchesSubcat(v, chip));
  }, [picks, f.subcat, availableChips]);

  const filteredGrid = useMemo(() => {
    let result = categoryVenues.filter((v) => !pickSlugs.has(v.slug));
    if (f.query.trim()) {
      const q = f.query.trim().toLowerCase();
      result = result.filter((v) =>
        [v.name, v.area, v.description].join(" ").toLowerCase().includes(q)
      );
    }
    if (f.area !== "all") {
      result = result.filter((v) => (v.area?.split(",")[0] ?? "").trim() === f.area);
    }
    if (f.goodFor !== "all") {
      result = result.filter((v) => v.bestForTags?.includes(f.goodFor));
    }
    if (f.time !== "any") {
      result = result.filter((v) =>
        v.timeOfDay?.includes(f.time as "morning" | "afternoon" | "evening" | "late-night")
      );
    }
    if (f.subcat !== "all" && availableChips) {
      const chip = availableChips.find((c) => c.key === f.subcat);
      if (chip) {
        result = result.filter((v) => venueMatchesSubcat(v, chip));
      }
    }
    // Recommended order: stable-sort so venues with confirmed real images appear before
    // those that would show the "Photo coming soon" placeholder. Within each group
    // (has-image / no-image) the original API order is preserved. This runs before
    // the Activities diversity pass so the round-robin naturally picks image venues first.
    // A–Z sort skips this step entirely.
    if (f.sort !== "az") {
      result = [...result].sort((a, b) => {
        const aImg = hasVenueImage(a) ? 0 : 1;
        const bImg = hasVenueImage(b) ? 0 : 1;
        return aImg - bImg;
      });
    }

    // All-mode: diverse default ordering — round-robin through category groups so the
    // first visible rows show Blaniko's full range, not a wall of pool/billiards venues.
    // Pool/billiards follows after other activity types. A-Z and active filters skip this.
    if (isAllMode && f.subcat === "all" && f.sort !== "az" &&
        !f.query.trim() && f.area === "all" && f.goodFor === "all" && f.time === "any") {
      const poolChip = ACTIVITIES_CHIPS.find((c) => c.key === "pool")!;
      const categoryOrder = ["sports", "gaming", "outdoor", "family", "activities"];
      const assigned = new Set<string>();
      const diverse: typeof result = [];

      // Round-robin through categories, skipping pool for the activities slots
      let added = true;
      while (added) {
        added = false;
        for (const cat of categoryOrder) {
          const match = result.find(
            (v) =>
              !assigned.has(v.slug) &&
              v.categorySlug === cat &&
              (cat !== "activities" || !venueMatchesSubcat(v, poolChip)),
          );
          if (match) {
            diverse.push(match);
            assigned.add(match.slug);
            added = true;
          }
        }
      }

      // Pool/billiards venues follow after all other activity types
      for (const v of result) {
        if (!assigned.has(v.slug) && venueMatchesSubcat(v, poolChip)) {
          diverse.push(v);
          assigned.add(v.slug);
        }
      }

      // Any unmatched venues (e.g. no category keywords) go last
      for (const v of result) {
        if (!assigned.has(v.slug)) diverse.push(v);
      }

      result = diverse;
    }

    // Activities: diverse default ordering when no subcat chip is selected
    if (slug === "activities" && f.subcat === "all" && f.sort !== "az" && availableChips) {
      const poolChip = availableChips.find((c) => c.key === "pool");
      const otherChips = availableChips.filter((c) => c.key !== "pool");
      const assigned = new Set<string>();
      const diverse: typeof result = [];
      // Round-robin through non-pool chip types so first rows are varied
      let added = true;
      while (added) {
        added = false;
        for (const chip of otherChips) {
          const match = result.find(
            (v) => !assigned.has(v.slug) && venueMatchesSubcat(v, chip),
          );
          if (match) {
            diverse.push(match);
            assigned.add(match.slug);
            added = true;
          }
        }
      }
      // Pool/billiards venues follow after other types
      if (poolChip) {
        for (const v of result) {
          if (!assigned.has(v.slug) && venueMatchesSubcat(v, poolChip)) {
            diverse.push(v);
            assigned.add(v.slug);
          }
        }
      }
      // Any venues not matched by any chip go last
      for (const v of result) {
        if (!assigned.has(v.slug)) diverse.push(v);
      }
      result = diverse;
    }
    if (f.sort === "az") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [categoryVenues, pickSlugs, f, availableChips, slug, isAllMode]);

  const collageImages = useMemo(() => {
    const coverImg = CATEGORY_IMAGES[slug ?? ""] ?? "";
    // Only venues with a confirmed real image contribute slats — venues whose
    // externalId has no matching file in public/images/venues/ return a 404 URL
    // which renders as the solid purple fallback background. hasVenueImage guards this.
    const venueImgs = categoryVenues
      .filter((v) => hasVenueImage(v))
      .map((v) => getVenueImageSrc(v))
      .filter((url): url is string => !!url)
      .slice(0, 4);
    return [coverImg, ...venueImgs].filter(Boolean).slice(0, 5);
  }, [categoryVenues, slug]);

  const otherCategories = useMemo(
    () => isAllMode ? [] : categories.filter((c) => c.slug !== slug),
    [slug, isAllMode],
  );

  /* ---- Audience redirect map ---- */
  const audienceFilterRedirect: Record<string, { href: string; title: string; desc: string; cta: string }> = {
    couples: { href: "/categories?bestFor=date-spot", title: d.couplesRedirectTitle, desc: d.couplesRedirectDesc, cta: d.couplesCta },
    friends: { href: "/categories?bestFor=friends",   title: d.friendsRedirectTitle,  desc: d.friendsRedirectDesc,  cta: d.friendsCta  },
  };

  /* ---- Early returns (loading / error / not found) ---- */
  if (isLoading) {
    return (
      <div className="bl-category-page">
        <HomeHeader labels={dictionary.header} />
        <div className="blc-shell">
          <div className="blc-main">
            <div className="bl-category-loading">{d.findingPlaces}</div>
            <div className="blc-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <VenueCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bl-category-page">
        <HomeHeader labels={dictionary.header} />
        <div className="blc-shell">
          <div className="blc-main">
            <p className="bl-api-error">{dictionary.common.apiError}</p>
            <button type="button" className="bl-retry-btn" onClick={retry}>
              {dictionary.common.retry}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAllMode && !category) {
    return (
      <div className="bl-category-page">
        <HomeHeader labels={dictionary.header} />
        <div className="blc-shell">
          <div className="blc-main">
            <div className="bl-category-not-found">
              <Link to="/categories" className="bl-category-back-link">← {d.backHome}</Link>
              <h1 className="bl-category-not-found-title">{d.notFoundTitle}</h1>
              <p className="bl-category-not-found-description">{d.notFoundDescription}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Empty / audience redirect state (category routes only) ---- */
  if (!isAllMode && categoryVenues.length === 0) {
    const audienceRedirect = slug ? audienceFilterRedirect[slug] : undefined;
    return (
      <div className="bl-category-page">
        <HomeHeader labels={dictionary.header} />
        <div className="blc-shell">
          <div className="blc-main">
            {audienceRedirect ? (
              <div className="bl-category-empty bl-category-empty--filter">
                <p className="bl-category-empty-icon" aria-hidden="true">✦</p>
                <h2 className="bl-category-empty-title">{audienceRedirect.title}</h2>
                <p className="bl-category-empty-desc">{audienceRedirect.desc}</p>
                <div className="bl-category-empty-actions">
                  <Link to={audienceRedirect.href} className="bl-category-empty-cta">{audienceRedirect.cta}</Link>
                </div>
              </div>
            ) : (
              <div className="bl-category-empty">
                <p className="bl-category-empty-icon" aria-hidden="true">🌿</p>
                <h2 className="bl-category-empty-title">{d.emptyComingSoonTitle}</h2>
                <p className="bl-category-empty-desc">
                  {d.emptyComingSoonDescBefore}{" "}
                  {category ? (dictionary.categoryNames[category.slug] ?? category.name) : ""}{" "}
                  {d.emptyComingSoonDescAfter}
                </p>
                <div className="bl-category-empty-actions">
                  <Link to="/categories" className="bl-category-empty-cta">{d.browseAll}</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---- Main render ---- */
  return (
    <div className="bl-category-page">
      <HomeHeader labels={dictionary.header} />

      {/* Category navigation tabs */}
      <div className="blc-cattabs-wrap">
        <CategoryTabs activeSlug={slug} categoryNames={dictionary.categoryNames} />
      </div>

      {/* mobile filter bar */}
      <div className="blc-filterbar">
        <div className="blc-field">
          <CIcon name="search" size={15} />
          <input
            type="text"
            value={f.query}
            placeholder={d.searchVenues}
            onChange={(e) => set("query", e.target.value)}
          />
        </div>
        <button type="button" className="blc-filterbtn" onClick={() => setDrawer(true)}>
          <CIcon name="sliders" size={15} /> {d.filtersBtn}
        </button>
      </div>

      <div className="blc-shell">
        {/* ---- SIDEBAR COL — stretches to full row height so sticky works through All Venues ---- */}
        <div className="blc-sidebar-col">
        <aside className="blc-sidebar">
          <Link to="/" className="blc-back">
            <CIcon name="back" size={14} /> {dictionary.claudeHome.navExplore}
          </Link>
          <div>
            <p className="blc-side-eyebrow">{d.sidebarEyebrow}</p>
            <p className="blc-side-title">
              {d.sidebarTitle}{" "}
              <span className="blc-spark"><CIcon name="spark" size={14} /></span>
            </p>
          </div>
          <FilterControls
            f={f} set={set} clearAll={clearAll}
            areas={areas} goodForOptions={goodForOptions}
            language={language} d={d}
            onPlanCta={() => setDrawer(false)}
          />
        </aside>
        </div>

        {/* ---- MAIN ---- */}
        <main className="blc-main">

          {/* HERO */}
          <section className="blc-hero">
            <div className="blc-hero-body">
              <p className="blc-hero-eyebrow">
                <CIcon name="spark" size={11} /> {isAllMode ? d.allVenuesEyebrow : d.eyebrow}
              </p>
              <h1 className="blc-hero-title">
                {dictionary.categoryNames[heroKey] ?? (category?.name ?? dictionary.categoryNames["all"])}
              </h1>
              <svg
                className="blc-hero-squiggle" width="88" height="9" viewBox="0 0 92 9"
                fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
              >
                <path d="M2 5c5-5 10-5 15 0s10 5 15 0 10-5 15 0 10 5 15 0 10-5 15 0" />
              </svg>
              <p className="blc-hero-desc">
                {dictionary.categoryDescriptions[heroKey] ?? (category?.description ?? dictionary.categoryDescriptions["all"])}
              </p>
              <div className="blc-hero-stats">
                <div className="blc-stat">
                  <span className="blc-stat-ic"><CIcon name="building" size={17} /></span>
                  <div>
                    <p className="blc-stat-n">{filteredGrid.length + filteredPicks.length}</p>
                    <p className="blc-stat-l">{d.results}</p>
                  </div>
                </div>
              </div>
            </div>

            {collageImages.length > 0 ? (
              <div className="blc-hero-art" aria-hidden="true">
                <div className="blc-hero-slats">
                  {collageImages.map((src, i) => (
                    <span key={i} className={`blc-hero-slat s${i + 1}`} style={{ backgroundImage: `url(${src})` }} />
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          {/* SUBCATEGORY CHIPS — only rendered for categories with a defined chip set */}
          {visibleChips.length > 0 ? (
            <div className="blc-subcat-wrap">
              <span className="blc-subcat-label" aria-hidden="true">{d.subcatLabel}</span>
              <div className="blc-subcat-row" role="group" aria-label={d.subcatLabel}>
                <button
                  type="button"
                  className={`blc-chip${f.subcat === "all" ? " active" : ""}`}
                  onClick={() => set("subcat", "all")}
                >
                  {d.goodForAll}
                </button>
                {visibleChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    className={`blc-chip${f.subcat === chip.key ? " active" : ""}`}
                    onClick={() => set("subcat", chip.key)}
                  >
                    {chip.labels[language]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* TOP PICKS — hidden entirely when a chip is active and no picks match it */}
          {filteredPicks.length > 0 ? (
            <section aria-label={d.topPicksTitle}>
              <div className="blc-sec-head">
                <h2 className="blc-sec-title">
                  {d.topPicksTitle}{" "}
                  <span className="blc-spark"><CIcon name="spark" size={14} /></span>
                </h2>
                <a href="#all-venues" className="blc-sec-link">
                  {d.topPicksLink} <CIcon name="arrow" size={13} />
                </a>
              </div>
              <div className="blc-picks">
                {filteredPicks.map((venue) => (
                  <FeaturedCard
                    key={venue.slug}
                    venue={venue} language={language}
                    isFav={isFavorite(venue.slug)} onToggleFav={toggleFavorite}
                    featuredLabel={d.featuredBadge} exploreLabel={d.explore}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* ALL VENUES */}
          <section aria-label={isAllMode ? d.moreVenuesTitle : d.allVenuesTitle} id="all-venues">
            <div className="blc-sec-head">
              <h2 className="blc-sec-title">
                {isAllMode ? d.moreVenuesTitle : d.allVenuesTitle}{" "}
                {!isAllMode && <span className="blc-count">({filteredGrid.length})</span>}
              </h2>
              <div className="blc-sec-right">
                <span className="blc-showing">
                  {isAllMode
                    ? d.showingMoreCount.replace("{count}", String(filteredGrid.length))
                    : `${d.showingCount} ${filteredGrid.length} ${filteredGrid.length === 1 ? d.result : d.results}`}
                </span>
                <div className="blc-viewtoggle" role="group" aria-label="View">
                  <button className={view === "grid" ? "active" : ""} aria-label={d.gridView} onClick={() => setView("grid")}>
                    <CIcon name="grid" size={14} />
                  </button>
                  <button className={view === "list" ? "active" : ""} aria-label={d.listView} onClick={() => setView("list")}>
                    <CIcon name="list" size={14} />
                  </button>
                </div>
              </div>
            </div>

            {filteredGrid.length > 0 ? (
              <div className={`blc-grid${view === "list" ? " list" : ""}`}>
                {filteredGrid.map((venue) => {
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
                      personality={{
                        bestForTags: venue.bestForTags,
                        timeOfDay: venue.timeOfDay,
                        energyLevel: venue.energyLevel,
                        socialLevel: venue.socialLevel,
                        spaceType: venue.spaceType,
                      }}
                      href={`/venues/${venue.slug}?from=category${slug ? `&category=${slug}` : ""}`}
                      isFavorite={isFavorite(venue.slug)}
                      onToggleFavorite={toggleFavorite}
                      language={language}
                      labels={dictionary.venueCard}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="blc-no-results">
                <h4 className="blc-no-results-title">{d.noVenuesTitle}</h4>
                <p className="blc-no-results-sub">{d.noVenuesSub}</p>
                <button type="button" className="blc-no-results-btn" onClick={clearAll}>
                  {d.clearFilters}
                </button>
              </div>
            )}

            {/* related categories */}
            {otherCategories.length > 0 ? (
              <div className="blc-related" style={{ marginTop: "2.5rem" }}>
                <span className="lbl">{d.exploreMore}</span>
                {otherCategories.map((c) => (
                  <Link key={c.slug} to={`/categories/${c.slug}`} className="blc-chip">
                    {dictionary.categoryNames[c.slug] ?? c.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
        </main>
      </div>

      {/* ---- MOBILE DRAWER ---- */}
      <div className={`blc-drawer-scrim${drawer ? " show" : ""}`} onClick={() => setDrawer(false)} aria-hidden="true" />
      <aside className={`blc-drawer${drawer ? " open" : ""}`} aria-hidden={!drawer}>
        <div className="blc-drawer-head">
          <h3>{d.sidebarTitle}</h3>
          <button className="blc-icon-btn" aria-label="Close filters" onClick={() => setDrawer(false)}>
            <CIcon name="x" size={16} />
          </button>
        </div>
        <FilterControls
          f={f} set={set} clearAll={clearAll}
          areas={areas} goodForOptions={goodForOptions}
          language={language} d={d}
          onPlanCta={() => setDrawer(false)}
        />
      </aside>
    </div>
  );
}
