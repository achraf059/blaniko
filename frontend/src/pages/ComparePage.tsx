import { Link } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { useCompare } from "../hooks/useCompare";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import { buildCompareInsights } from "../utils/compareInsights";
import { explainVenueMatch } from "../utils/discoveryInsights";
import {
  getBestForBadges,
  getVenuePersonalitySection,
  getVenuePersonalitySignals,
} from "../utils/venuePersonality";
import "./ComparePage.css";

export default function ComparePage() {
  const { dictionary } = useI18n();
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
          <p className="bl-compare-eyebrow">Venue compare</p>
          <h1 className="bl-compare-title">Compare venues side by side</h1>
          <p className="bl-compare-subtitle">
            Keep up to 3 venues and compare category, area, budget, vibe, and
            fit before deciding.
          </p>

          <div className="bl-compare-actions">
            <p>{compareCount} selected</p>
            {compareCount > 0 ? (
              <button type="button" onClick={clearCompare}>
                Clear compare
              </button>
            ) : null}
          </div>
        </section>

        {compareSlugs.length === 0 ? (
          <section className="bl-compare-empty">
            <h2>No venues selected yet.</h2>
            <p>
              Add venues from search, favorites, recommendations, collections,
              or detail pages.
            </p>
            <div className="bl-compare-empty-links">
              <Link to="/search">Go to search</Link>
              <Link to="/favorites">Open favorites</Link>
            </div>
          </section>
        ) : (
          <>
            {availableVenues.length > 0 ? (
              <section className="bl-compare-decision-helper">
                <h2>Decision helper</h2>
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
                const whyChips = explainVenueMatch(venue, {}, 4);
                const badges = getBestForBadges(venue, 3);
                const signals = getVenuePersonalitySignals(venue);
                const standout = insights.standoutByVenue[venue.slug] ?? [];
                const personality = getVenuePersonalitySection(venue);

                return (
                  <article key={venue.slug} className="bl-compare-card">
                    <div className="bl-compare-card-head">
                      <p className="bl-compare-category">{venue.category}</p>
                      <button
                        type="button"
                        onClick={() => removeFromCompare(venue.slug)}
                      >
                        Remove
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
                      <p className="bl-compare-group-title">Quick profile</p>
                      <div className="bl-compare-meta">
                        <p>
                          <strong>Category:</strong> {venue.category}
                        </p>
                        <p>
                          <strong>Budget:</strong> {venue.priceLevel ?? "—"}
                        </p>
                        <p>
                          <strong>Area:</strong> {venue.area}
                        </p>
                      </div>
                    </div>

                    <div className="bl-compare-group">
                      <p className="bl-compare-group-title">
                        Vibe & personality
                      </p>
                      <div className="bl-compare-meta">
                        <p>
                          <strong>Vibe:</strong> {venue.vibe ?? "—"}
                        </p>
                        <p>
                          <strong>Audience:</strong> {venue.audience ?? "—"}
                        </p>
                        <p>
                          <strong>Personality:</strong>{" "}
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
                      {venue.shortDescription ?? venue.description}
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
            <h3>Unavailable venues</h3>
            <p>Some compared venues are no longer available in shared data.</p>
            <ul>
              {missingSlugs.map((slug) => (
                <li key={slug}>
                  <span>{slug}</span>
                  <button type="button" onClick={() => removeFromCompare(slug)}>
                    Remove
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
