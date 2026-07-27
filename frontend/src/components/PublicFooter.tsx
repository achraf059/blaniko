import { Link } from "react-router";
import { useI18n } from "../i18n/useI18n";
import "./PublicFooter.css";

export default function PublicFooter() {
  const { dictionary } = useI18n();
  const f = dictionary.publicFooter;

  return (
    <footer className="bl-public-footer">
      <div className="bl-public-footer-inner">
        <div className="bl-public-footer-brand">
          <span className="bl-public-footer-logo">Blaniko</span>
          <p className="bl-public-footer-tagline">{f.tagline}</p>
        </div>

        <nav className="bl-public-footer-nav" aria-label="Footer">
          <a href="/#about">{f.about}</a>
          <Link to="/partners">{f.forVenues}</Link>
          <Link to="/privacy">{f.privacy}</Link>
        </nav>

        <div className="bl-public-footer-bottom">
          <span>{f.madeIn}</span>
        </div>
      </div>
    </footer>
  );
}
