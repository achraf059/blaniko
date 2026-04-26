import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useCompare } from "../../hooks/useCompare";
import { getFlowTexts } from "../../i18n/flowTexts";
import { useI18n } from "../../i18n/useI18n";
import { LanguageSwitcher } from "../LanguageSwitcher";
import "./GlobalNav.css";

export type GlobalNavProps = {
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

export function GlobalNav({ labels }: GlobalNavProps) {
  const { compareCount } = useCompare();
  const { language } = useI18n();
  const text = getFlowTexts(language);
  const compareLabel = `${text.common.compare} (${compareCount})`;
  const [isScrolled, setIsScrolled] = useState(false);
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    let frameId: number | null = null;

    const updateScrolledState = () => {
      setIsScrolled(window.scrollY > 8);
      frameId = null;
    };

    const handleScroll = () => {
      if (frameId !== null) {
        return;
      }
      frameId = window.requestAnimationFrame(updateScrolledState);
    };

    updateScrolledState();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const closeMobileMenu = () => {
    if (mobileMenuRef.current) {
      mobileMenuRef.current.open = false;
    }
  };

  return (
    <header
      className={`bl-global-nav-header${isScrolled ? " is-scrolled" : ""}`}
    >
      <nav className="bl-global-nav" aria-label="Main navigation">
        <Link to="/" className="bl-global-nav-brand" aria-label="Blaniko home">
          <span className="bl-global-nav-brand-mark" aria-hidden="true" />
          <span className="bl-global-nav-brand-text">Blaniko</span>
        </Link>

        <ul className="bl-global-nav-links">
          <li>
            <Link to="/guides" className="bl-global-nav-link">
              {text.common.guides}
            </Link>
          </li>
          <li>
            <Link to="/map" className="bl-global-nav-link">
              {labels.map}
            </Link>
          </li>
          <li>
            <Link to="/favorites" className="bl-global-nav-link">
              {labels.favorites}
            </Link>
          </li>
          <li>
            <Link to="/compare" className="bl-global-nav-link">
              {compareLabel}
            </Link>
          </li>
          <li>
            <Link to="/admin" className="bl-global-nav-link bl-global-nav-link-admin">
              {labels.admin}
            </Link>
          </li>
        </ul>

        <div className="bl-global-nav-actions">
          <details ref={mobileMenuRef} className="bl-global-nav-mobile-menu">
            <summary className="bl-global-nav-mobile-summary">{text.common.menu}</summary>
            <div className="bl-global-nav-mobile-panel">
              <Link to="/guides" className="bl-global-nav-mobile-link" onClick={closeMobileMenu}>
                {text.common.guides}
              </Link>
              <Link to="/map" className="bl-global-nav-mobile-link" onClick={closeMobileMenu}>
                {labels.map}
              </Link>
              <Link
                to="/favorites"
                className="bl-global-nav-mobile-link"
                onClick={closeMobileMenu}
              >
                {labels.favorites}
              </Link>
              <Link to="/compare" className="bl-global-nav-mobile-link" onClick={closeMobileMenu}>
                {compareLabel}
              </Link>
              <Link
                to="/admin"
                className="bl-global-nav-mobile-link bl-global-nav-mobile-link-admin"
                onClick={closeMobileMenu}
              >
                {labels.admin}
              </Link>
            </div>
          </details>

          <LanguageSwitcher
            labelEn={labels.languageEn}
            labelFr={labels.languageFr}
          />

          <Link to="/search" className="bl-global-nav-cta">
            {labels.exploreNow}
          </Link>
        </div>
      </nav>
    </header>
  );
}
