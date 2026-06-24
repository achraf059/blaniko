import { useState, useMemo, useCallback } from "react";
import { Link, useParams } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueCard } from "../components/home/VenueCard";
import { categories, getVenueDisplay } from "../data/mockData";
import { getBestForTagLabel } from "../data/bestForTags";
import { useFavorites } from "../hooks/useFavorites";
import { usePageMeta } from "../hooks/usePageMeta";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import { getVenueImageSrc } from "../utils/venueImage";
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
        {imageUrl ? (
          <img className="blc-media-img" src={imageUrl} alt={venue.name} loading="lazy" />
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
};

const EMPTY_FILTERS: FilterState = {
  query: "", sort: "recommended", area: "all", goodFor: "all", time: "any",
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
   Main component
   ============================================================ */
export default function CategoryPage() {
  const { slug } = useParams();
  const { dictionary, language } = useI18n();
  const { venues, isLoading, error } = useVenues();
  const { isFavorite, toggleFavorite } = useFavorites();
  const d = dictionary.categoryPage;

  /* ---- All hooks must come before any conditional return ---- */
  const [f, setF] = useState<FilterState>(EMPTY_FILTERS);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [drawer, setDrawer] = useState(false);

  const set = useCallback(<K extends keyof FilterState>(k: K, v: FilterState[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
  }, []);
  const clearAll = useCallback(() => setF(EMPTY_FILTERS), []);

  const category = categories.find((item) => item.slug === slug);
  usePageMeta(
    category
      ? `${dictionary.categoryNames[category.slug] ?? category.name} in Casablanca | Blaniko`
      : "Category | Blaniko",
    category?.description,
  );

  const categoryVenues = useMemo(
    () => venues.filter((v) => v.categorySlug === slug),
    [venues, slug],
  );

  const picks = useMemo(() => {
    const withImages = categoryVenues.filter((v) => !!getVenueImageSrc(v));
    return withImages.slice(0, 3);
  }, [categoryVenues]);

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
    if (f.sort === "az") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [categoryVenues, pickSlugs, f]);

  const collageImages = useMemo(() => {
    const coverImg = CATEGORY_IMAGES[slug ?? ""] ?? "";
    const venueImgs = categoryVenues
      .map((v) => getVenueImageSrc(v))
      .filter((url): url is string => !!url)
      .slice(0, 4);
    return [coverImg, ...venueImgs].filter(Boolean).slice(0, 5);
  }, [categoryVenues, slug]);

  const otherCategories = useMemo(
    () => categories.filter((c) => c.slug !== slug),
    [slug],
  );

  /* ---- Audience redirect map ---- */
  const audienceFilterRedirect: Record<string, { href: string; title: string; desc: string; cta: string }> = {
    couples: { href: "/search?bestFor=date-spot", title: d.couplesRedirectTitle, desc: d.couplesRedirectDesc, cta: d.couplesCta },
    friends: { href: "/search?bestFor=friends",   title: d.friendsRedirectTitle,  desc: d.friendsRedirectDesc,  cta: d.friendsCta  },
  };

  /* ---- Early returns (loading / error / not found) ---- */
  if (isLoading) {
    return (
      <div className="bl-category-page">
        <HomeHeader labels={dictionary.header} />
        <div className="blc-shell">
          <div className="blc-main">
            <div className="bl-category-loading">{d.findingPlaces}</div>
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
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="bl-category-page">
        <HomeHeader labels={dictionary.header} />
        <div className="blc-shell">
          <div className="blc-main">
            <div className="bl-category-not-found">
              <Link to="/" className="bl-category-back-link">← {d.backHome}</Link>
              <h1 className="bl-category-not-found-title">{d.notFoundTitle}</h1>
              <p className="bl-category-not-found-description">{d.notFoundDescription}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Empty / audience redirect state ---- */
  if (categoryVenues.length === 0) {
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
                  {dictionary.categoryNames[category.slug] ?? category.name}{" "}
                  {d.emptyComingSoonDescAfter}
                </p>
                <div className="bl-category-empty-actions">
                  <Link to="/search" className="bl-category-empty-cta">{d.browseAll}</Link>
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
        {/* ---- SIDEBAR ---- */}
        <aside className="blc-sidebar">
          <Link to="/" className="blc-back">
            <CIcon name="back" size={14} /> {d.backHome}
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

        {/* ---- MAIN ---- */}
        <main className="blc-main">

          {/* HERO */}
          <section className="blc-hero">
            <div className="blc-hero-body">
              <p className="blc-hero-eyebrow">
                <CIcon name="spark" size={11} /> {d.eyebrow}
              </p>
              <h1 className="blc-hero-title">
                {dictionary.categoryNames[category.slug] ?? category.name}
              </h1>
              <svg
                className="blc-hero-squiggle" width="88" height="9" viewBox="0 0 92 9"
                fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
              >
                <path d="M2 5c5-5 10-5 15 0s10 5 15 0 10-5 15 0 10 5 15 0 10-5 15 0" />
              </svg>
              <p className="blc-hero-desc">
                {dictionary.categoryDescriptions[category.slug] ?? category.description}
              </p>
              <div className="blc-hero-stats">
                <div className="blc-stat">
                  <span className="blc-stat-ic"><CIcon name="building" size={17} /></span>
                  <div>
                    <p className="blc-stat-n">{categoryVenues.length}</p>
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

          {/* TOP PICKS */}
          {picks.length > 0 ? (
            <section aria-label={d.topPicksTitle}>
              <div className="blc-sec-head">
                <h2 className="blc-sec-title">
                  {d.topPicksTitle}{" "}
                  <span className="blc-spark"><CIcon name="spark" size={14} /></span>
                </h2>
                <Link to="/search" className="blc-sec-link">
                  {d.topPicksLink} <CIcon name="arrow" size={13} />
                </Link>
              </div>
              <div className="blc-picks">
                {picks.map((venue) => (
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
          <section aria-label={d.allVenuesTitle}>
            <div className="blc-sec-head">
              <h2 className="blc-sec-title">
                {d.allVenuesTitle}{" "}
                <span className="blc-count">({filteredGrid.length})</span>
              </h2>
              <div className="blc-sec-right">
                <span className="blc-showing">
                  {d.showingCount} {filteredGrid.length} {filteredGrid.length === 1 ? d.result : d.results}
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
                      href={`/venues/${venue.slug}?from=category&category=${slug}`}
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
