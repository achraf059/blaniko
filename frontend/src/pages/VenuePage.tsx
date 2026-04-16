import { Link, useParams, useSearchParams } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { venues } from "../data/mockData";
import { useI18n } from "../i18n/useI18n";
import "./VenuePage.css";

export default function VenuePage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { dictionary } = useI18n();

  const from = searchParams.get("from");
  const categoryFromQuery = searchParams.get("category");

  const isValidSlug =
    typeof categoryFromQuery === "string" && /^[a-z0-9-]+$/.test(categoryFromQuery);

  const backHref =
    from === "category" && isValidSlug ? `/categories/${categoryFromQuery}` : "/";
  const backLabel =
    from === "category" && isValidSlug
      ? dictionary.venuePage.backToCategory
      : dictionary.venuePage.backToHome;

  const venue = venues.find((item) => item.slug === slug);

  if (!venue) {
    return (
      <div className="bl-venue-page">
        <HomeHeader labels={dictionary.header} />

        <main className="bl-venue-main">
          <section className="bl-venue-not-found">
            <Link to={backHref} className="bl-venue-back-link">
              ← {backLabel}
            </Link>

            <h1 className="bl-venue-not-found-title">{dictionary.venuePage.notFoundTitle}</h1>

            <p className="bl-venue-not-found-description">
              {dictionary.venuePage.notFoundDescription}
            </p>
          </section>
        </main>
      </div>
    );
  }

  const shortDescription = venue.shortDescription ?? venue.description;
  const overview =
    venue.overview ??
    dictionary.venuePage.fallbackOverview
      .replace("{name}", venue.name)
      .replace("{category}", venue.category.toLowerCase())
      .replace("{area}", venue.area);
  const vibe = venue.vibe ?? dictionary.venuePage.fallbackVibe;
  const audience = venue.audience ?? dictionary.venuePage.fallbackAudience;
  const priceLevel = venue.priceLevel ?? dictionary.venuePage.fallbackPriceLevel;

  return (
    <div className="bl-venue-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-venue-main">
        <section className="bl-venue-hero">
          <div className="bl-venue-hero-glow-right" />
          <div className="bl-venue-hero-glow-left" />

          <div className="bl-venue-hero-grid">
            <div>
              <Link to={backHref} className="bl-venue-back-link">
                ← {backLabel}
              </Link>

              <p className="bl-venue-category-pill">{venue.category}</p>

              <h1 className="bl-venue-title">{venue.name}</h1>

              <p className="bl-venue-area-line">
                {dictionary.venuePage.area}: <span>{venue.area}</span>
              </p>

              <p className="bl-venue-short-description">{shortDescription}</p>
            </div>

            <div className="bl-venue-side-panel">
              <div className="bl-venue-side-panel-image" />
              <p className="bl-venue-side-panel-eyebrow">{dictionary.venuePage.panelEyebrow}</p>
              <p className="bl-venue-side-panel-subtitle">{dictionary.venuePage.panelSubtitle}</p>
            </div>
          </div>
        </section>

        <section className="bl-venue-content-grid">
          <div className="bl-venue-overview-card">
            <h2 className="bl-venue-overview-title">{dictionary.venuePage.overview}</h2>
            <p className="bl-venue-overview-text">{overview}</p>
          </div>

          <div className="bl-venue-meta-grid">
            <div className="bl-venue-meta-card">
              <p className="bl-venue-meta-label">{dictionary.venuePage.vibe}</p>
              <p className="bl-venue-meta-value">{vibe}</p>
            </div>

            <div className="bl-venue-meta-card">
              <p className="bl-venue-meta-label">{dictionary.venuePage.audience}</p>
              <p className="bl-venue-meta-value">{audience}</p>
            </div>

            <div className="bl-venue-meta-card">
              <p className="bl-venue-meta-label">{dictionary.venuePage.priceLevel}</p>
              <p className="bl-venue-meta-value">{priceLevel}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
