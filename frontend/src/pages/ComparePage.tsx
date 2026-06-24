import { Link } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { getVenueDisplay } from "../data/mockData";
import { useCompare } from "../hooks/useCompare";
import { usePageMeta } from "../hooks/usePageMeta";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import { formatFlowText, getFlowTexts } from "../i18n/flowTexts";
import { buildCompareInsights } from "../utils/compareInsights";
import { explainVenueMatch } from "../utils/discoveryInsights";
import {
  getBestForBadges,
  getVenuePersonalitySection,
  getVenuePersonalitySignals,
} from "../utils/venuePersonality";
import "./ComparePage.css";

export default function ComparePage() {
  const { dictionary, language } = useI18n();
  const text = getFlowTexts(language);
  usePageMeta(
    language === "fr" ? "Comparer des lieux | Blaniko" : "Compare Venues | Blaniko",
    language === "fr"
      ? "Comparez des lieux à Casablanca côte à côte pour trouver ce qui vous convient."
      : "Compare Casablanca venues side by side to find the best fit.",
  );
  const { compareSlugs, compareCount, removeFromCompare, clearCompare } =
    useCompare();
  const { venuesBySlug } = useVenues();

  const availableVenues = compareSlugs
    .map((slug) => venuesBySlug[slug])
    .filter((venue): venue is NonNullable<typeof venue> => Boolean(venue));

  const insights = buildCompareInsights(availableVenues);

  const missingSlugs = compareSlugs.filter((slug) => !venuesBySlug[slug]);

  return (
    <div className="bl-compare-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-compare-main">
        <section className="bl-compare-hero">
          <p className="bl-compare-eyebrow">{text.comparePage.eyebrow}</p>
          <h1 className="bl-compare-title">{text.comparePage.title}</h1>
          <p className="bl-compare-subtitle">{text.comparePage.subtitle}</p>

          <div className="bl-compare-actions">
            <p>{formatFlowText(text.comparePage.selectedCount, { count: compareCount })}</p>
            {compareCount > 0 ? (
              <button type="button" onClick={clearCompare}>
                {text.comparePage.clearCompare}
              </button>
            ) : null}
          </div>
        </section>

        {compareSlugs.length === 0 ? (
          <section className="bl-compare-empty">
            <h2>{text.comparePage.emptyTitle}</h2>
            <p>{text.comparePage.emptyDescription}</p>
            <div className="bl-compare-empty-links">
              <Link to="/search">{text.comparePage.goSearch}</Link>
              <Link to="/favorites">{text.comparePage.openFavorites}</Link>
            </div>
          </section>
        ) : (
          <>
            {availableVenues.length > 0 ? (
              <section className="bl-compare-decision-helper">
                <h2>{text.comparePage.decisionHelper}</h2>
                <p>{insights.summary}</p>

                {insights.insightChips.length > 0 ? (
                  <div className="bl-compare-helper-chips">
                    {insights.insightChips.map((chip) => (
                      <span key={chip}>{chip}</span>
                    ))}
                  </div>
                ) : null}

                {insights.callouts.length > 0 ? (
                  <div className="bl-compare-helper-callouts">
                    {insights.callouts.map((callout) => (
                      <Link
                        key={`${callout.label}-${callout.venueSlug}`}
                        to={`/venues/${callout.venueSlug}?from=compare`}
                      >
                        <strong>{callout.label}</strong>
                        <span>{callout.venueName}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="bl-compare-grid">
              {availableVenues.map((venue) => {
                const vd = getVenueDisplay(venue, language);
                const categoryName = dictionary.categoryNames[venue.categorySlug] ?? venue.category;
                const whyChips = explainVenueMatch(venue, {}, 4, language);
                const badges = getBestForBadges(vd, 3, language);
                const signals = getVenuePersonalitySignals(vd, language);
                const standout = insights.standoutByVenue[venue.slug] ?? [];
                const personality = getVenuePersonalitySection(vd, language);

                return (
                  <article key={venue.slug} className="bl-compare-card">
                    <div className="bl-compare-card-head">
                      <p className="bl-compare-category">{categoryName}</p>
                      <button
                        type="button"
                        onClick={() => removeFromCompare(venue.slug)}
                      >
                        {text.common.remove}
                      </button>
                    </div>

                    <h2 className="bl-compare-name">{venue.name}</h2>
                    <p className="bl-compare-area">📍 {venue.area}</p>

                    {standout.length > 0 ? (
                      <div className="bl-compare-standout">
                        {standout.map((item) => (
                          <span key={`${venue.slug}-${item}`}>{item}</span>
                        ))}
                      </div>
                    ) : null}

                    <div className="bl-compare-group">
                      <p className="bl-compare-group-title">{text.comparePage.quickProfile}</p>
                      <div className="bl-compare-meta">
                        <p>
                          <strong>{text.comparePage.labelCategory}:</strong> {categoryName}
                        </p>
                        <p>
                          <strong>{text.comparePage.labelBudget}:</strong> {venue.priceLevel ?? text.common.noDataDash}
                        </p>
                        <p>
                          <strong>{text.comparePage.labelArea}:</strong> {venue.area}
                        </p>
                      </div>
                    </div>

                    <div className="bl-compare-group">
                      <p className="bl-compare-group-title">
                        {text.comparePage.vibePersonality}
                      </p>
                      <div className="bl-compare-meta">
                        <p>
                          <strong>{text.comparePage.labelVibe}:</strong> {vd.vibe ?? text.common.noDataDash}
                        </p>
                        <p>
                          <strong>{text.comparePage.labelAudience}:</strong> {vd.audience ?? text.common.noDataDash}
                        </p>
                        <p>
                          <strong>{text.comparePage.labelPersonality}:</strong>{" "}
                          {personality.whyPeopleChoose}
                        </p>
                      </div>
                    </div>

                    {badges.length > 0 ? (
                      <div className="bl-compare-badges">
                        {badges.map((badge, index) => (
                          <span key={`${venue.slug}-badge-${badge}-${index}`}>
                            {badge}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {signals.length > 0 ? (
                      <p className="bl-compare-signals">
                        {signals.join(" • ")}
                      </p>
                    ) : null}

                    <p className="bl-compare-description">
                      {vd.shortDescription ?? vd.description}
                    </p>

                    <div className="bl-compare-why">
                      {whyChips.map((chip) => (
                        <span key={`${venue.slug}-${chip}`}>{chip}</span>
                      ))}
                    </div>

                    <Link
                      to={`/venues/${venue.slug}?from=compare`}
                      className="bl-compare-link"
                    >
                      {dictionary.venueCard.viewDetails}
                    </Link>
                  </article>
                );
              })}
            </section>
          </>
        )}

        {missingSlugs.length > 0 ? (
          <section className="bl-compare-missing">
            <h3>{text.comparePage.missingTitle}</h3>
            <p>{text.comparePage.missingDescription}</p>
            <ul>
              {missingSlugs.map((slug) => (
                <li key={slug}>
                  <span>{slug}</span>
                  <button type="button" onClick={() => removeFromCompare(slug)}>
                    {text.common.remove}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
