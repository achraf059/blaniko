import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useI18n } from "../../i18n/useI18n";
import { getFlowTexts } from "../../i18n/flowTexts";
import { LanguageSwitcher } from "../LanguageSwitcher";
import "./GlobalNav.css";

export type GlobalNavProps = {
  labels: {
    home: string;
    categories: string;
    venues: string;
    favorites: string;
    map: string;
    about: string;
    exploreNow: string;
    languageEn: string;
    languageFr: string;
  };
};

export function GlobalNav({ labels }: GlobalNavProps) {
  const { language, dictionary } = useI18n();
  const text = getFlowTexts(language);
  const homeNav = dictionary.claudeHome;
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
          <img src="/brand/blaniko-wordmark.png" alt="Blaniko" className="bl-global-nav-wordmark" />
        </Link>

        <ul className="bl-global-nav-links">
          <li>
            <a href="/#explore" className="bl-global-nav-link">
              {homeNav.navExplore}
            </a>
          </li>
          <li>
            <a href="/#categories" className="bl-global-nav-link">
              {homeNav.navCategories}
            </a>
          </li>
          <li>
            <a href="/#curated" className="bl-global-nav-link">
              {homeNav.navCurated}
            </a>
          </li>
          <li>
            <a href="/#map" className="bl-global-nav-link">
              {homeNav.navMap}
            </a>
          </li>
        </ul>

        <div className="bl-global-nav-actions">
          <details ref={mobileMenuRef} className="bl-global-nav-mobile-menu">
            <summary className="bl-global-nav-mobile-summary">{text.common.menu}</summary>
            <div className="bl-global-nav-mobile-panel">
              <a href="/#explore" className="bl-global-nav-mobile-link" onClick={closeMobileMenu}>
                {homeNav.navExplore}
              </a>
              <a href="/#categories" className="bl-global-nav-mobile-link" onClick={closeMobileMenu}>
                {homeNav.navCategories}
              </a>
              <a href="/#curated" className="bl-global-nav-mobile-link" onClick={closeMobileMenu}>
                {homeNav.navCurated}
              </a>
              <a href="/#map" className="bl-global-nav-mobile-link" onClick={closeMobileMenu}>
                {homeNav.navMap}
              </a>
              <Link to="/favorites" className="bl-global-nav-mobile-link" onClick={closeMobileMenu}>
                {homeNav.saved}
              </Link>
            </div>
          </details>

          <Link to="/favorites" className="bl-global-nav-saved-pill">
            {homeNav.saved}
          </Link>

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
