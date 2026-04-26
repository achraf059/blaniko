import { Link } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueImage } from "../components/home/VenueImage";
import {
  editorialCollections,
  getCollectionDisplay,
  resolveEditorialCollectionVenues,
} from "../data/editorialCollections";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import { formatFlowText, getFlowTexts } from "../i18n/flowTexts";
import "./HomePage.css";
import "./GuidesPage.css";

export default function GuidesPage() {
  const { dictionary, language } = useI18n();
  const text = getFlowTexts(language);
  const { venues } = useVenues();

  return (
    <div className="bl-guides-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-guides-main">
        <section className="bl-guides-hero">
          <p className="bl-guides-eyebrow">{text.guidesPage.eyebrow}</p>
          <h1 className="bl-guides-title">{text.guidesPage.title}</h1>
          <p className="bl-guides-subtitle">{text.guidesPage.subtitle}</p>
        </section>

        <section className="bl-guides-grid">
          {editorialCollections.map((collection) => {
            const display = getCollectionDisplay(collection, language);
            const matchedVenues = resolveEditorialCollectionVenues(
              collection,
              venues,
            );

            return (
              <article key={collection.id} className="bl-guides-card">
                <div className="bl-guides-card-cover">
                  <VenueImage
                    categorySlug={collection.slug.includes("date") ? "outdoor" : "culture"}
                    aspectRatio="16 / 10"
                  />
                </div>

                <div className="bl-guides-card-body">
                  <p className="bl-guides-card-kicker">
                    {text.guidesPage.editorialCollection}
                  </p>
                  <h2 className="bl-guides-card-title">{display.title}</h2>
                  <p className="bl-guides-card-description">
                    {display.description}
                  </p>

                  {display.explanationChips?.length ? (
                    <div className="bl-guides-card-chips">
                      {display.explanationChips.map((chip) => (
                        <span key={`${collection.slug}-${chip}`}>{chip}</span>
                      ))}
                    </div>
                  ) : null}

                  <div className="bl-guides-card-meta">
                    <p>
                      {formatFlowText(text.guidesPage.matchedVenues, {
                        count: matchedVenues.length,
                      })}
                    </p>
                    <Link to={`/guides/${collection.slug}`} className="bl-guides-card-link">
                      Read guide <span>→</span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
