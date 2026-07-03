import { useMemo, useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import {
  editorialCollections,
  getCollectionDisplay,
  resolveEditorialCollectionVenues,
} from "../data/editorialCollections";
import { useVenues } from "../hooks/useVenues";
import { usePageMeta } from "../hooks/usePageMeta";
import { useI18n } from "../i18n/useI18n";
import { getFlowTexts } from "../i18n/flowTexts";
import "./GuidesPage.css";

// ── Icon helpers ──────────────────────────────────────────────────────────────

function IconArrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}
function IconLevel() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19V9M9 19V5M14 19v-7M19 19v-11" />
    </svg>
  );
}
function IconSpark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z" />
      <path d="M19 13l.7 2.3L22 16l-2.3.7L19 19l-.7-2.3L16 16l2.3-.7z" />
    </svg>
  );
}
function IconBookmark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4h12v16l-6-4-6 4V4Z" />
    </svg>
  );
}
function IconCompass() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" />
    </svg>
  );
}
function IconSun() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function IconTrend() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 17 9 11l4 4 8-8" /><path d="M21 7v5h-5" />
    </svg>
  );
}

// ── Scroll reveal hook ────────────────────────────────────────────────────────

function useReveal(dep: string | number) {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      document.querySelectorAll<HTMLElement>(".blg-reveal").forEach((el) => el.classList.add("in"));
      return;
    }
    const sweep = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      document.querySelectorAll<HTMLElement>(".blg-reveal:not(.in)").forEach((el) => {
        if (el.getBoundingClientRect().top < vh * 0.93) el.classList.add("in");
      });
    };
    const raf = requestAnimationFrame(() => { sweep(); requestAnimationFrame(sweep); });
    window.addEventListener("scroll", sweep, { passive: true });
    window.addEventListener("resize", sweep);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", sweep);
      window.removeEventListener("resize", sweep);
    };
  }, [dep]);
}

// ── Filter definitions ────────────────────────────────────────────────────────

const FILTER_KEYS = ["all", "date", "budget", "indoor", "outdoor", "friends", "sunset", "weekend"] as const;
type FilterKey = typeof FILTER_KEYS[number];

// ── Main component ────────────────────────────────────────────────────────────

export default function GuidesPage() {
  const { language, dictionary } = useI18n();
  const text = getFlowTexts(language);
  const t = text.guidesPage;
  const { venues } = useVenues();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const moodRef = useRef<HTMLElement>(null);

  usePageMeta(
    language === "fr" ? "Guides de sortie | Blaniko" : "City Guides | Blaniko",
    language === "fr"
      ? "Guides thématiques pour vos activités, sports, gaming et sorties à Casablanca."
      : "Curated city guides for activities, sports, gaming and outings in Casablanca.",
  );

  useReveal(activeFilter);

  // The spotlight guide is always the "sunset-places" guide (best hero imagery)
  const spotlightGuide = useMemo(
    () => editorialCollections.find((c) => c.slug === "sunset-places") ?? editorialCollections[0],
    [],
  );
  const spotlightDisplay = useMemo(
    () => getCollectionDisplay(spotlightGuide, language),
    [spotlightGuide, language],
  );
  const spotlightCount = useMemo(
    () => resolveEditorialCollectionVenues(spotlightGuide, venues).length,
    [spotlightGuide, venues],
  );

  // Peek cards: 3 other guides used as background stack
  const peekGuides = useMemo(
    () => editorialCollections.filter((c) => c.slug !== spotlightGuide.slug).slice(0, 3),
    [spotlightGuide],
  );

  // Editor's pick: featured guide used as the large left card in the row
  const editorGuide = useMemo(
    () => editorialCollections.find((c) => c.slug === "date-friendly-activity-ideas") ?? editorialCollections[0],
    [],
  );
  const editorDisplay = useMemo(() => getCollectionDisplay(editorGuide, language), [editorGuide, language]);
  const editorCount = useMemo(
    () => resolveEditorialCollectionVenues(editorGuide, venues).length,
    [editorGuide, venues],
  );

  // Filter chips config
  const filterLabels: Record<FilterKey, string> = {
    all: t.filterAll,
    date: t.filterDate,
    budget: t.filterBudget,
    indoor: t.filterIndoor,
    outdoor: t.filterOutdoor,
    friends: t.filterFriends,
    sunset: t.filterSunset,
    weekend: t.filterWeekend,
  };

  // Filtered guide list
  const filteredGuides = useMemo(() => {
    if (activeFilter === "all") return editorialCollections;
    return editorialCollections.filter((c) => (c.moods ?? []).includes(activeFilter));
  }, [activeFilter]);

  // Guide row: shows all (or filtered) guides excluding the editor's pick and the hero spotlight
  const moodGuides = useMemo(
    () => filteredGuides.filter((c) => c.slug !== editorGuide.slug && c.slug !== spotlightGuide.slug),
    [filteredGuides, editorGuide.slug, spotlightGuide.slug],
  );

  // Love strip links to date-friendly guide (explicit slug lookup, not array index)
  const loveGuide = editorialCollections.find((c) => c.slug === "date-friendly-activity-ideas") ?? editorialCollections[0];

  const TRUST = [
    { title: t.trust0title, sub: t.trust0sub, icon: <IconPin /> },
    { title: t.trust1title, sub: t.trust1sub, icon: <IconCompass /> },
    { title: t.trust2title, sub: t.trust2sub, icon: <IconSun /> },
  ];

  const TRENDING_CHIPS = [
    t.trendingChip0, t.trendingChip1, t.trendingChip2, t.trendingChip3, t.trendingChip4,
  ];

  const HOW_STEPS = [
    { title: t.howStep0title, sub: t.howStep0sub, icon: <IconSpark /> },
    { title: t.howStep1title, sub: t.howStep1sub, icon: <IconCompass /> },
    { title: t.howStep2title, sub: t.howStep2sub, icon: <IconSun /> },
    { title: t.howStep3title, sub: t.howStep3sub, icon: <IconBookmark /> },
  ];

  const badgeLabel = (c: typeof editorialCollections[0]) =>
    language === "fr" && c.badgeFr ? c.badgeFr.label : c.badge?.label ?? "";

  const levelLabel = (c: typeof editorialCollections[0]) =>
    language === "fr" && c.levelFr ? c.levelFr : (c.level ?? "Easy");

  return (
    <div className="bl-guides-page">
      <HomeHeader labels={dictionary.header} />

      <main className="blg-main">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="blg-hero">
          <div className="blg-hero-left blg-reveal">
            <p className="blg-eyebrow">
              <span className="blg-eyebrow-spark"><IconSpark /></span>
              {t.eyebrow}
            </p>
            <h1 className="blg-hero-title">
              {language === "fr" ? (
                <>Guides <em>de la ville</em></>
              ) : (
                <>Curated <em>city guides</em></>
              )}
            </h1>
            <p className="blg-hero-lede">{t.heroLede}</p>
            <div className="blg-hero-actions">
              <button
                type="button"
                className="blg-btn-gold"
                onClick={() => moodRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                {t.heroExplore} <IconArrow />
              </button>
              <Link to="/favorites" className="blg-btn-ghost">
                <IconBookmark /> {t.heroBrowse}
              </Link>
            </div>
            <div className="blg-trust">
              {TRUST.map((item, i) => (
                <div className="blg-trust-item" key={i}>
                  <span className="blg-trust-ic">{item.icon}</span>
                  <div>
                    <p className="blg-trust-t">{item.title}</p>
                    <p className="blg-trust-s">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="blg-hero-right blg-reveal">
            {/* decorative dotted route lines */}
            <svg className="blg-hero-route" viewBox="0 0 520 360" fill="none" aria-hidden="true" preserveAspectRatio="none">
              <path d="M30 70 C 150 10, 300 30, 470 90" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 8" opacity="0.5" />
              <path d="M60 320 C 200 360, 360 330, 500 250" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 8" opacity="0.35" />
              <circle cx="30" cy="70" r="3.5" fill="currentColor" opacity="0.7" />
              <circle cx="500" cy="250" r="3.5" fill="currentColor" opacity="0.6" />
            </svg>

            {/* left collage image */}
            <div className="blg-hero-collage" aria-hidden="true">
              <img src="/homepage/backgrounds/hero-casablanca-full-background.webp" alt="" />
            </div>

            {/* featured spotlight card */}
            <Link
              to={`/guides/${spotlightGuide.slug}`}
              className="blg-spotlight"
              aria-label={spotlightDisplay.title}
            >
              {spotlightGuide.image && (
                <img className="blg-spotlight-img" src={spotlightGuide.image} alt={spotlightDisplay.title} />
              )}
              <span className="blg-spotlight-scrim" aria-hidden="true" />
              {spotlightGuide.badge && (
                <span className="blg-badge" data-mood="featured" aria-hidden="true">
                  {t.featuredCollection}
                </span>
              )}
              <div className="blg-spotlight-body">
                <h2 className="blg-spotlight-title">{spotlightDisplay.title}</h2>
                <p className="blg-spotlight-desc">{spotlightDisplay.subtitle}</p>
                <div className="blg-spotlight-foot">
                  <div className="blg-meta-row">
                    <span className="blg-meta"><IconPin /> {spotlightCount} {t.spots}</span>
                    {spotlightGuide.time && (
                      <span className="blg-meta"><IconClock /> {spotlightGuide.time}</span>
                    )}
                  </div>
                  <span className="blg-view-pill">{t.exploreGuide} <IconArrow /></span>
                </div>
              </div>
            </Link>

            {/* peek stack */}
            <div className="blg-peeks" aria-hidden="true">
              {peekGuides.map((pg) => (
                <div className="blg-peek" key={pg.slug}>
                  {pg.image && <img src={pg.image} alt="" />}
                  <span className="blg-peek-scrim" />
                  <div className="blg-peek-cap">
                    <h4>{getCollectionDisplay(pg, language).title}</h4>
                    <p>
                      <IconPin />
                      {resolveEditorialCollectionVenues(pg, venues).length} {t.spots}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Filter chips ──────────────────────────────────────────────── */}
        <p className="blg-chips-label">{t.chipsLabel}</p>
        <div className="blg-filters blg-reveal" role="tablist" aria-label="Guide filters">
          <div className="blg-chips-scroll">
            {FILTER_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeFilter === key}
                className={`blg-chip${activeFilter === key ? " active" : ""}`}
                onClick={() => setActiveFilter(key)}
              >
                {filterLabels[key]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Guides for every mood ─────────────────────────────────────── */}
        <section className="blg-mood" ref={moodRef} id="blg-mood">
          <div className="blg-sec-head blg-reveal">
            <h2 className="blg-sec-title">
              {t.moodTitle}
              <span className="blg-title-spark" aria-hidden="true"><IconSpark /></span>
            </h2>
            {activeFilter !== "all" && (
              <Link to="/guides" className="blg-sec-link" onClick={() => setActiveFilter("all")}>
                {t.viewAll} <IconArrow />
              </Link>
            )}
          </div>

          <div className="blg-mood-outer blg-reveal">
            <div className="blg-mood-row">
              {/* Editor's pick card */}
              <Link to={`/guides/${editorGuide.slug}`} className="blg-editor" data-screen-label="Editor's pick">
                {editorGuide.image && (
                  <img className="blg-editor-img" src={editorGuide.image} alt={editorDisplay.title} />
                )}
                <span className="blg-editor-scrim" aria-hidden="true" />
                <div className="blg-editor-body">
                  <p className="blg-eyebrow">
                    {t.editorPick} <span aria-hidden="true"><IconSpark /></span>
                  </p>
                  <h3 className="blg-editor-title">{editorDisplay.title}</h3>
                  <p className="blg-editor-desc">{editorDisplay.subtitle}</p>
                  <div className="blg-editor-meta blg-meta-row">
                    <span className="blg-meta"><IconPin /> {editorCount} {t.spots}</span>
                    {editorGuide.time && (
                      <span className="blg-meta"><IconClock /> {editorGuide.time}</span>
                    )}
                  </div>
                  <span className="blg-editor-cta">
                    {t.exploreGuide} <IconArrow />
                  </span>
                </div>
              </Link>

              {/* Guide cards */}
              {moodGuides.map((guide) => {
                const display = getCollectionDisplay(guide, language);
                const count = resolveEditorialCollectionVenues(guide, venues).length;
                return (
                  <Link
                    key={guide.slug}
                    to={`/guides/${guide.slug}`}
                    className="blg-gcard"
                    aria-label={display.title}
                  >
                    <div className="blg-gcard-media">
                      <span className="blg-gcard-grad" aria-hidden="true" />
                      {guide.badge && (
                        <span className="blg-badge" data-mood={guide.badge.mood}>
                          {badgeLabel(guide)}
                        </span>
                      )}
                      {guide.image ? (
                        <img className="blg-gcard-img" src={guide.image} alt={display.title} loading="lazy" />
                      ) : (
                        <div className="blg-gcard-img blg-gcard-placeholder" aria-hidden="true">
                          <span>Blaniko</span>
                        </div>
                      )}
                    </div>
                    <div className="blg-gcard-body">
                      <h3 className="blg-gcard-title">{display.title}</h3>
                      <p className="blg-gcard-desc">{display.subtitle}</p>
                      <div className="blg-gcard-foot">
                        <div className="blg-meta-row">
                          <span className="blg-meta"><IconPin /> {count} {t.spots}</span>
                          {guide.time && (
                            <span className="blg-meta"><IconClock /> {guide.time}</span>
                          )}
                          {guide.level && (
                            <span className="blg-meta"><IconLevel /> {levelLabel(guide)}</span>
                          )}
                        </div>
                        <span className="blg-round-btn" aria-hidden="true">
                          <IconArrow />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {moodGuides.length === 0 && (
            <div className="blg-empty-mood">
              <p className="blg-empty-mood-title">{t.noGuidesInMood}</p>
              <p className="blg-empty-mood-sub">{t.noGuidesInMoodSub}</p>
              <button type="button" className="blg-btn-ghost" onClick={() => setActiveFilter("all")}>
                {t.showAllGuides}
              </button>
            </div>
          )}
        </section>

        {/* ── Bottom editorial strips ───────────────────────────────────── */}
        <section className="blg-strips blg-reveal">
          {/* Local love strip */}
          <Link to={`/guides/${loveGuide.slug}`} className="blg-strip blg-strip--love">
            <img className="blg-strip-img" src="/homepage/backgrounds/hero-casablanca-full-background.webp" alt="" />
            <span className="blg-strip-scrim" aria-hidden="true" />
            <div className="blg-strip-inner">
              <p className="blg-eyebrow">{t.featuredCollection}</p>
              <h3 className="blg-strip-title">{t.localLoveTitle}</h3>
              <p className="blg-strip-sub">{t.localLoveSub}</p>
              <div className="blg-strip-stats">
                <span className="blg-meta"><IconCompass /> {t.localLoveStat0}</span>
                <span className="blg-meta"><IconPin /> {t.localLoveStat1}</span>
              </div>
            </div>
          </Link>

          {/* Trending strip */}
          <div className="blg-strip blg-strip--trend">
            <span className="blg-trend-ic" aria-hidden="true"><IconTrend /></span>
            <div>
              <p className="blg-eyebrow">
                {t.trendingNow} <span aria-hidden="true"><IconSpark /></span>
              </p>
              <h3 className="blg-strip-title">{t.trendingTitle}</h3>
              <div className="blg-trend-chips">
                {TRENDING_CHIPS.map((chip, i) => (
                  <button
                    key={i}
                    type="button"
                    className="blg-trend-chip"
                    onClick={() => navigate(`/search?q=${encodeURIComponent(chip)}`)}
                  >
                    {chip}
                  </button>
                ))}
                <Link to="/search" className="blg-trend-all">
                  {t.viewAllShort} <IconArrow />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── How Blaniko guides work ───────────────────────────────────── */}
        <section className="blg-how blg-reveal">
          <div className="blg-how-head">
            <div>
              <p className="blg-eyebrow"><IconCompass /> {t.howSub}</p>
              <h2 className="blg-how-title">{t.howTitle}</h2>
            </div>
          </div>
          <div className="blg-how-steps">
            {HOW_STEPS.map((step, i) => (
              <div className="blg-step" key={i}>
                <span className="blg-step-ic">{step.icon}</span>
                <p className="blg-step-n">{t.stepLabel} {i + 1}</p>
                <h3 className="blg-step-t">{step.title}</h3>
                <p className="blg-step-s">{step.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Build your perfect outing CTA ────────────────────────────── */}
        <section className="blg-plan blg-reveal">
          <div className="blg-plan-body">
            <p className="blg-eyebrow"><IconSpark /> {t.planEyebrow}</p>
            <h2 className="blg-plan-title">{t.planTitle}</h2>
            <p className="blg-plan-desc">{t.planDesc}</p>
          </div>
          <Link to="/plan" className="blg-btn-gold blg-plan-btn">
            {t.planButton} <IconArrow />
          </Link>
        </section>

      </main>
    </div>
  );
}
