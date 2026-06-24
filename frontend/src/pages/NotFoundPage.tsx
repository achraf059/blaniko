import { Link } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { useI18n } from "../i18n/useI18n";
import { usePageMeta } from "../hooks/usePageMeta";
import "./NotFoundPage.css";

export default function NotFoundPage() {
  const { dictionary, language } = useI18n();

  usePageMeta(
    language === "fr" ? "Page introuvable | Blaniko" : "Page not found | Blaniko",
  );

  return (
    <div className="bl-notfound-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-notfound-main">
        <section className="bl-notfound-card">
          <p className="bl-notfound-eyebrow">404</p>
          <h1 className="bl-notfound-title">{dictionary.notFoundPage.title}</h1>
          <p className="bl-notfound-desc">
            {dictionary.notFoundPage.description}
          </p>
          <div className="bl-notfound-actions">
            <Link to="/" className="bl-notfound-btn-primary">
              {dictionary.notFoundPage.backToHome}
            </Link>
            <Link to="/search" className="bl-notfound-btn-secondary">
              {dictionary.notFoundPage.browseVenues}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
