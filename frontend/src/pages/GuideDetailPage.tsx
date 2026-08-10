import { useEffect, useMemo } from "react";
import { Link, useLocation, useParams } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import {
  editorialCollections,
  getCollectionDisplay,
  getEditorialCollectionBySlug,
  resolveEditorialCollectionVenues,
  type EditorialCollection,
} from "../data/editorialCollections";
import { getVenueDisplay } from "../data/mockData";
import { useVenues } from "../hooks/useVenues";
import { useFavorites } from "../hooks/useFavorites";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { usePageMeta } from "../hooks/usePageMeta";
import { useI18n } from "../i18n/useI18n";
import { getFlowTexts } from "../i18n/flowTexts";
import type { AppLanguage } from "../i18n/types";
import { getBestForBadges } from "../utils/venuePersonality";
import { getVenueImageSrc } from "../utils/venueImage";
import { VenueImage } from "../components/home/VenueImage";
import PublicFooter from "../components/PublicFooter";
import "./GuidesPage.css";
import "./GuideDetailPage.css";

// ── Icons ──────────────────────────────────────────────────────────────────────

function IconArrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
    </svg>
  );
}
function IconBack() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" /><path d="m11 6-6 6 6 6" />
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
function IconCompass() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" />
    </svg>
  );
}
function IconLayers() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" />
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
function IconHeart({ filled }: { filled: boolean }) {
  return filled ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

// ── Scroll reveal ──────────────────────────────────────────────────────────────

function useReveal(dep: unknown) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      document.querySelectorAll<HTMLElement>(".blg-reveal").forEach((el) => el.classList.add("in"));
      return;
    }
    const sweep = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      document.querySelectorAll<HTMLElement>(".blg-reveal:not(.in)").forEach((el) => {
        if (el.getBoundingClientRect().top < vh * 0.92) el.classList.add("in");
      });
    };
    const r1 = requestAnimationFrame(() => {
      sweep();
      requestAnimationFrame(sweep);
    });
    window.addEventListener("scroll", sweep, { passive: true });
    window.addEventListener("resize", sweep);
    return () => {
      cancelAnimationFrame(r1);
      window.removeEventListener("scroll", sweep);
      window.removeEventListener("resize", sweep);
    };
  }, [dep]);
}

// ── Related guide card ────────────────────────────────────────────────────────

function RelatedGuideCard({
  collection,
  language,
}: {
  collection: EditorialCollection;
  language: AppLanguage;
}) {
  const display = getCollectionDisplay(collection, language);
  const badgeMood = collection.badge?.mood;
  const badgeLabel =
    language === "fr"
      ? (collection.badgeFr?.label ?? collection.badge?.label)
      : collection.badge?.label;

  return (
    <Link to={`/guides/${collection.slug}`} className="blg-gcard">
      <div className="blg-gcard-media">
        {collection.image ? (
          <img
            className="blg-gcard-img"
            src={collection.image}
            alt={display.title}
            loading="lazy"
          />
        ) : (
          <div className="blg-gcard-placeholder">
            <span>Blaniko</span>
          </div>
        )}
        <span className="blg-gcard-grad" aria-hidden="true" />
        {badgeLabel && badgeMood ? (
          <span className="blg-badge" data-mood={badgeMood}>{badgeLabel}</span>
        ) : null}
      </div>
      <div className="blg-gcard-body">
        <h3 className="blg-gcard-title">{display.title}</h3>
        <p className="blg-gcard-desc">{display.subtitle}</p>
        <div className="blg-gcard-foot">
          <div className="blg-meta-row">
            {collection.time ? (
              <span className="blg-meta" style={{ color: "var(--ink-soft)" }}>
                <IconClock /> {collection.time}
              </span>
            ) : null}
          </div>
          <span className="blg-round-btn" aria-hidden="true">
            <IconArrow />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GuideDetailPage() {
  const { dictionary, language } = useI18n();
  const text = getFlowTexts(language);
  const { slug } = useParams();
  const location = useLocation();
  const { venues } = useVenues();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { trackActivity } = useRecentActivity();

  // V3 price safety: the budget-based "under-100-mad" guide is not publicly resolvable
  // until verified prices exist, so /guides/under-100-mad falls through to the not-found view.
  const resolvedCollection = getEditorialCollectionBySlug(slug);
  const collection =
    resolvedCollection && resolvedCollection.slug !== "under-100-mad"
      ? resolvedCollection
      : undefined;
  const display = collection ? getCollectionDisplay(collection, language) : null;

  usePageMeta(
    display
      ? `${display.title} | Blaniko`
      : "Guide | Blaniko",
  );

  // Scroll to top on slug change
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  useEffect(() => {
    if (!collection) return;
    trackActivity({
      id: collection.slug,
      type: "guide",
      title: collection.title,
      href: `${location.pathname}${location.search}`,
    });
  }, [collection, location.pathname, location.search, trackActivity]);

  useReveal(slug);

  const matchedVenues = collection ? resolveEditorialCollectionVenues(collection, venues) : [];

  const relatedGuides = useMemo(() => {
    const currentGuide = editorialCollections.find((c) => c.slug === slug);
    const currentMoods = currentGuide?.moods ?? [];
    // V3 price safety: exclude the budget-based "under-100-mad" guide from related cards.
    return editorialCollections
      .filter((c) => c.slug !== slug && c.slug !== "under-100-mad")
      .map((c, originalIndex) => ({
        collection: c,
        sharedMoods: (c.moods ?? []).filter((m) => currentMoods.includes(m)).length,
        originalIndex,
      }))
      .sort((a, b) => b.sharedMoods - a.sharedMoods || a.originalIndex - b.originalIndex)
      .slice(0, 3)
      .map((item) => item.collection);
  }, [slug]);

  const badgeLabel = collection
    ? language === "fr"
      ? (collection.badgeFr?.label ?? collection.badge?.label)
      : collection.badge?.label
    : undefined;

  const levelLabel = collection
    ? language === "fr"
      ? (collection.levelFr ?? collection.level ?? text.guideDetailPage.levelEasy)
      : (collection.level ?? text.guideDetailPage.levelEasy)
    : undefined;

  if (!collection || !display) {
    return (
      <div className="bl-guides-page">
        <HomeHeader labels={dictionary.header} />
        <div className="blg-detail">
          <Link to="/guides" className="blg-back">
            <IconBack /> {text.guideDetailPage.backToGuides}
          </Link>
          <div className="blg-detail-notfound">
            <h1>{text.guideDetailPage.notFoundTitle}</h1>
            <p>{text.guideDetailPage.notFoundDescription}</p>
            <div className="blg-nf-links">
              <Link to="/guides" className="blg-btn-ghost">
                {text.guideDetailPage.backToGuides}
              </Link>
              <Link to="/categories" className="blg-btn-ghost">
                {text.guideDetailPage.exploreVenues}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bl-guides-page">
      <HomeHeader labels={dictionary.header} />

      <div className="blg-detail">
        {/* Back link */}
        <Link to="/guides" className="blg-back">
          <IconBack /> {text.guideDetailPage.backToAllGuides}
        </Link>

        {/* Editorial hero */}
        <section className="blg-dhero blg-reveal">
          {collection.image ? (
            <img className="blg-dhero-img" src={collection.image} alt={display.title} />
          ) : null}
          <span className="blg-dhero-scrim" aria-hidden="true" />
          <div className="blg-dhero-body">
            {badgeLabel && collection.badge?.mood ? (
              <span className="blg-badge" data-mood={collection.badge.mood}>
                {badgeLabel}
              </span>
            ) : null}
            <h1 className="blg-dhero-title">{display.title}</h1>
            <p className="blg-dhero-sub">{display.subtitle}</p>
            {display.explanationChips?.length ? (
              <div className="blg-chip-tags">
                {display.explanationChips.map((chip) => (
                  <span key={chip} className="blg-chip-tag">{chip}</span>
                ))}
              </div>
            ) : null}
            <div className="blg-dhero-meta">
              <span className="blg-meta">
                <IconPin /> {matchedVenues.length} {text.guideDetailPage.venuesIn}
              </span>
              {collection.time ? (
                <span className="blg-meta"><IconClock /> {collection.time}</span>
              ) : null}
              {levelLabel ? (
                <span className="blg-meta"><IconLevel /> {levelLabel}</span>
              ) : null}
            </div>
          </div>
        </section>

        {/* Body: description + why-it-works + side rail */}
        <div className="blg-body">
          <div>
            <p className="blg-lede-p blg-reveal">{display.description}</p>
            <div className="blg-why blg-reveal">
              <p className="blg-why-label">{text.guideDetailPage.whyLabel}</p>
              <p className="blg-why-quote">"{display.whyItMatters}"</p>
            </div>
          </div>

          <aside className="blg-rail blg-reveal">
            <p className="blg-rail-h">{text.guideDetailPage.nextLabel}</p>
            <Link
              to={display.cta?.href ?? "/categories"}
              className="blg-rail-btn primary"
            >
              <IconCompass /> {text.guideDetailPage.openVenues}
            </Link>
            <Link to="/guides" className="blg-rail-btn">
              <IconLayers /> {text.guideDetailPage.moreGuides}
            </Link>
          </aside>
        </div>

        {/* Venue list */}
        <section className="blg-venues">
          <div className="blg-sec-head blg-reveal">
            <h2 className="blg-sec-title">{text.guideDetailPage.whatsIn}</h2>
            <span className="blg-venue-count">
              {matchedVenues.length} {text.guideDetailPage.venuesIn}
            </span>
          </div>

          {matchedVenues.length === 0 ? (
            <div style={{ padding: "2rem 0", textAlign: "center" }}>
              <p style={{ color: "var(--ink-soft)", margin: "0 0 1rem" }}>
                {text.guideDetailPage.noVenuesDescription}
              </p>
              <Link to="/categories" className="blg-btn-ghost" style={{ display: "inline-flex" }}>
                {text.guideDetailPage.openSearch}
              </Link>
            </div>
          ) : (
            <div className="blg-vgrid blg-reveal">
              {matchedVenues.map((venue) => {
                const vd = getVenueDisplay(venue, language);
                const badges = getBestForBadges(vd, 2, language);
                const isFav = isFavorite(venue.slug);

                return (
                  <article key={venue.slug} className="blg-vcard">
                    <div className="blg-vcard-media">
                      <span className="blg-vcard-cat">
                        {dictionary.categoryNames[venue.categorySlug] ?? venue.category}
                      </span>
                      <button
                        type="button"
                        className="blg-fav"
                        aria-pressed={isFav}
                        aria-label={
                          isFav
                            ? (language === "fr"
                                ? `Retirer ${venue.name} des favoris`
                                : `Remove ${venue.name} from favorites`)
                            : (language === "fr"
                                ? `Sauvegarder ${venue.name}`
                                : `Save ${venue.name}`)
                        }
                        onClick={() => toggleFavorite(venue.slug)}
                      >
                        <IconHeart filled={isFav} />
                      </button>
                      <VenueImage
                        src={getVenueImageSrc(venue)}
                        alt={venue.name}
                        categorySlug={venue.categorySlug}
                        category={venue.category}
                        name={venue.name}
                        aspectRatio="16 / 9"
                      />
                      {venue.priceLevel ? (
                        <span className="blg-vcard-price">{venue.priceLevel}</span>
                      ) : null}
                    </div>
                    <div className="blg-vcard-body">
                      <h3 className="blg-vcard-name">{venue.name}</h3>
                      <p className="blg-vcard-area">
                        <IconPin /> {venue.area}
                      </p>
                      <p className="blg-vcard-desc">
                        {vd.shortDescription ?? vd.description}
                      </p>
                      <div className="blg-vcard-foot">
                        <div className="blg-vtags">
                          {badges.map((badge, i) => (
                            <span key={`${venue.slug}-b${i}`} className="blg-vtag">
                              {badge}
                            </span>
                          ))}
                        </div>
                        <Link
                          to={`/venues/${venue.slug}?from=guides`}
                          className="blg-vlink"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {text.guideDetailPage.explore} <IconArrow />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Bottom CTA */}
        {display.cta ? (
          <section className="blg-cta-close blg-reveal">
            <div>
              <p className="blg-eyebrow">{text.guideDetailPage.nextLabel}</p>
              <h3>{display.cta.label}</h3>
            </div>
            <Link to={display.cta.href} className="blg-btn-gold">
              {display.cta.label} <IconArrow />
            </Link>
          </section>
        ) : null}

        {/* Related guides */}
        {relatedGuides.length > 0 ? (
          <section className="blg-related">
            <div className="blg-sec-head blg-reveal">
              <h2 className="blg-sec-title">
                {text.guideDetailPage.related}{" "}
                <span className="blg-title-spark"><IconSpark /></span>
              </h2>
            </div>
            <div className="blg-related-grid blg-reveal">
              {relatedGuides.map((r) => (
                <RelatedGuideCard key={r.slug} collection={r} language={language} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <PublicFooter />
    </div>
  );
}
