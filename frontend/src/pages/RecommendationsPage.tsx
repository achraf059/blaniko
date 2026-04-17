import { Link, useSearchParams } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { useI18n } from "../i18n/useI18n";
import "./HomePage.css";
import "./RecommendationsPage.css";

export default function RecommendationsPage() {
  const { dictionary } = useI18n();
  const [searchParams] = useSearchParams();

  const query = searchParams.get("q");
  const category = searchParams.get("category");
  const budget = searchParams.get("budget");

  return (
    <div className="bl-reco-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-reco-main">
        <section className="bl-reco-card">
          <p className="bl-reco-eyebrow">{dictionary.recommendationsPage.eyebrow}</p>
          <h1 className="bl-reco-title">{dictionary.recommendationsPage.title}</h1>
          <p className="bl-reco-subtitle">{dictionary.recommendationsPage.subtitle}</p>

          <div className="bl-reco-params">
            <p>
              {dictionary.recommendationsPage.query}: <span>{query || "—"}</span>
            </p>
            <p>
              {dictionary.recommendationsPage.category}: <span>{category || "—"}</span>
            </p>
            <p>
              {dictionary.recommendationsPage.budget}: <span>{budget || "—"}</span>
            </p>
          </div>

          <Link to="/" className="bl-reco-back-link">
            ← {dictionary.recommendationsPage.backHome}
          </Link>
        </section>
      </main>
    </div>
  );
}
