import { Link } from "react-router";
import { LanguageSwitcher } from "../LanguageSwitcher";

type HomeHeaderProps = {
  labels: {
    home: string;
    categories: string;
    venues: string;
    favorites: string;
    about: string;
    exploreNow: string;
    languageEn: string;
    languageFr: string;
  };
};

export function HomeHeader({ labels }: HomeHeaderProps) {
  return (
    <header className="bl-home-header">
      <nav className="bl-home-nav">
        <Link to="/" className="bl-home-brand" aria-label="Blaniko home">
          <span className="bl-home-brand-dot" />
          <span className="bl-home-brand-text">Blaniko</span>
        </Link>

        <ul className="bl-home-nav-links">
          <li>
            <Link to="/" className="bl-home-nav-link">
              {labels.home}
            </Link>
          </li>
          <li>
            <Link to="/#categories" className="bl-home-nav-link">
              {labels.categories}
            </Link>
          </li>
          <li>
            <Link to="/#venues" className="bl-home-nav-link">
              {labels.venues}
            </Link>
          </li>
          <li>
            <Link to="/favorites" className="bl-home-nav-link">
              {labels.favorites}
            </Link>
          </li>
          <li>
            <Link to="/" className="bl-home-nav-link">
              {labels.about}
            </Link>
          </li>
        </ul>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Link to="/favorites" className="bl-home-nav-link">
            {labels.favorites}
          </Link>

          <LanguageSwitcher labelEn={labels.languageEn} labelFr={labels.languageFr} />

          <Link to="/#venues" className="bl-home-explore-btn">
            {labels.exploreNow}
          </Link>
        </div>
      </nav>
    </header>
  );
}
