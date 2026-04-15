import { Link } from "react-router";

type HomeHeaderProps = {
  labels: {
    home: string;
    categories: string;
    venues: string;
    about: string;
    exploreNow: string;
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
            <a href="#categories" className="bl-home-nav-link">
              {labels.categories}
            </a>
          </li>
          <li>
            <a href="#venues" className="bl-home-nav-link">
              {labels.venues}
            </a>
          </li>
          <li>
            <Link to="/" className="bl-home-nav-link">
              {labels.about}
            </Link>
          </li>
        </ul>

        <a href="#venues" className="bl-home-explore-btn">
          {labels.exploreNow}
        </a>
      </nav>
    </header>
  );
}
