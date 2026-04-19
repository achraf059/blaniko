import { Link } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import {
  editorialCollections,
  resolveEditorialCollectionVenues,
} from "../data/editorialCollections";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import "./HomePage.css";
import "./GuidesPage.css";

export default function GuidesPage() {
  const { dictionary } = useI18n();
  const { venues } = useVenues();

  return (
    <div className="bl-guides-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-guides-main">
        <section className="bl-guides-hero">
          <p className="bl-guides-eyebrow">Blaniko picks</p>
          <h1 className="bl-guides-title">Curated city guides</h1>
          <p className="bl-guides-subtitle">
            Local-first collections built to help you choose faster: date plans, budget picks,
            coworking cafés, sunset routes, and social nights.
          </p>
        </section>

        <section className="bl-guides-grid">
          {editorialCollections.map((collection) => {
            const matchedVenues = resolveEditorialCollectionVenues(collection, venues);

            return (
              <article key={collection.id} className="bl-guides-card">
                <div className="bl-guides-card-head">
                  <p className="bl-guides-card-kicker">Editorial collection</p>
                  <h2>{collection.title}</h2>
                </div>

                <p className="bl-guides-card-subtitle">{collection.subtitle}</p>
                <p className="bl-guides-card-description">{collection.description}</p>

                {collection.explanationChips?.length ? (
                  <div className="bl-guides-card-chips">
                    {collection.explanationChips.map((chip) => (
                      <span key={`${collection.slug}-${chip}`}>{chip}</span>
                    ))}
                  </div>
                ) : null}

                <div className="bl-guides-card-meta">
                  <p>{matchedVenues.length} matched venues</p>
                  <Link to={`/guides/${collection.slug}`}>Open guide →</Link>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}