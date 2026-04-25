import { Link } from "react-router";
import { useCompare } from "../../hooks/useCompare";
import { getFlowTexts } from "../../i18n/flowTexts";
import { useI18n } from "../../i18n/useI18n";
import { LanguageSwitcher } from "../LanguageSwitcher";

type HomeHeaderProps = {
  labels: {
    home: string;
    categories: string;
    venues: string;
    favorites: string;
    map: string;
    admin: string;
    about: string;
    exploreNow: string;
    languageEn: string;
    languageFr: string;
  };
};

export function HomeHeader({ labels }: HomeHeaderProps) {
  const { compareCount } = useCompare();
  const { language } = useI18n();
  const text = getFlowTexts(language);
  const compareLabel = `${text.common.compare} (${compareCount})`;

  return (
    <header className="bl-home-header">
      <nav className="bl-home-nav">
        <Link to="/" className="bl-home-brand" aria-label="Blaniko home">
          <span className="bl-home-brand-dot" />
          <span className="bl-home-brand-text">Blaniko</span>
        </Link>

        <ul className="bl-home-nav-links">
          <li>
            <Link to="/guides" className="bl-home-nav-link">
              {text.common.guides}
            </Link>
          </li>
          <li>
            <Link to="/map" className="bl-home-nav-link">
              {labels.map}
            </Link>
          </li>
          <li>
            <Link to="/favorites" className="bl-home-nav-link">
              {labels.favorites}
            </Link>
          </li>
          <li>
            <Link to="/compare" className="bl-home-nav-link">
              {compareLabel}
            </Link>
          </li>
          <li>
            <Link
              to="/admin"
              className="bl-home-nav-link bl-home-nav-link-admin"
            >
              {labels.admin}
            </Link>
          </li>
        </ul>

        <div className="bl-home-header-actions">
          <details className="bl-home-mobile-menu">
            <summary className="bl-home-mobile-menu-summary">{text.common.menu}</summary>
            <div className="bl-home-mobile-menu-panel">
              <Link to="/guides" className="bl-home-mobile-menu-link">
                {text.common.guides}
              </Link>
              <Link to="/map" className="bl-home-mobile-menu-link">
                {labels.map}
              </Link>
              <Link to="/favorites" className="bl-home-mobile-menu-link">
                {labels.favorites}
              </Link>
              <Link to="/compare" className="bl-home-mobile-menu-link">
                {compareLabel}
              </Link>
              <Link
                to="/admin"
                className="bl-home-mobile-menu-link bl-home-mobile-menu-link-admin"
              >
                {labels.admin}
              </Link>
            </div>
          </details>

          <LanguageSwitcher
            labelEn={labels.languageEn}
            labelFr={labels.languageFr}
          />

          <Link to="/search" className="bl-home-explore-btn">
            {labels.exploreNow}
          </Link>
        </div>
      </nav>
    </header>
  );
}
