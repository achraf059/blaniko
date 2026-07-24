import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router";
import { useI18n } from "../../i18n/useI18n";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../auth/useAuth";
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
    languageEn: string;
    languageFr: string;
  };
};

export function GlobalNav({ labels }: GlobalNavProps) {
  const { dictionary } = useI18n();
  const homeNav = dictionary.claudeHome;
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frameId: number | null = null;
    const updateScrolledState = () => {
      setIsScrolled(window.scrollY > 8);
      frameId = null;
    };
    const handleScroll = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(updateScrolledState);
    };
    updateScrolledState();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
    <a href="#main-content" className="skip-to-main">{homeNav.skipToMain}</a>
    <header
      className={`bl-global-nav-header${isScrolled ? " is-scrolled" : ""}`}
    >
      <nav className="bl-global-nav" aria-label="Main navigation">
        <Link to="/" className="bl-global-nav-brand" aria-label="Blaniko home">
          <img src="/brand/blaniko-wordmark.png" alt="Blaniko" className="bl-global-nav-wordmark" />
        </Link>

        {/* Desktop nav links — hidden below 1080px */}
        <ul className="bl-global-nav-links">
          <li>
            <NavLink
              to="/plan"
              className={({ isActive }) => `bl-global-nav-link${isActive ? " is-active" : ""}`}
            >
              {homeNav.navPlan}
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/map"
              className={({ isActive }) => `bl-global-nav-link${isActive ? " is-active" : ""}`}
            >
              {homeNav.navMap}
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/categories"
              end={false}
              className={({ isActive }) => `bl-global-nav-link${isActive ? " is-active" : ""}`}
            >
              {homeNav.navCategories}
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/guides"
              end={false}
              className={({ isActive }) => `bl-global-nav-link${isActive ? " is-active" : ""}`}
            >
              {homeNav.navGuides}
            </NavLink>
          </li>
        </ul>

        <div className="bl-global-nav-actions">
          <Link to="/favorites" className="bl-global-nav-saved-pill">
            {homeNav.saved}
          </Link>

          <Link
            to={user ? "/account" : "/login"}
            className={`bl-global-nav-auth-pill${user ? "" : " is-guest"}`}
          >
            {user ? homeNav.navAccount : homeNav.navSignIn}
          </Link>

          <LanguageSwitcher
            labelEn={labels.languageEn}
            labelFr={labels.languageFr}
          />

          {/* Theme toggle */}
          <button
            type="button"
            className="bl-theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? homeNav.navThemeToLight : homeNav.navThemeToDark}
            title={theme === "dark" ? homeNav.navThemeToLight : homeNav.navThemeToDark}
          >
            {theme === "dark" ? (
              /* Sun — visible in dark mode to switch to light */
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2"  x2="12" y2="4.5"  />
                <line x1="12" y1="19.5" x2="12" y2="22" />
                <line x1="4.22" y1="4.22"   x2="5.87" y2="5.87"   />
                <line x1="18.13" y1="18.13" x2="19.78" y2="19.78" />
                <line x1="2"  y1="12" x2="4.5" y2="12" />
                <line x1="19.5" y1="12" x2="22" y2="12" />
                <line x1="4.22" y1="19.78"  x2="5.87"  y2="18.13" />
                <line x1="18.13" y1="5.87" x2="19.78" y2="4.22"  />
              </svg>
            ) : (
              /* Moon — visible in light mode to switch to dark */
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Hamburger — always visible, opens categorised menu */}
          <div className="bl-global-nav-menu-wrap" ref={menuRef}>
            <button
              className="bl-global-nav-hamburger"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                  <line x1="2" y1="2" x2="14" y2="14" />
                  <line x1="14" y1="2" x2="2" y2="14" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                  <line x1="1" y1="3.5" x2="15" y2="3.5" />
                  <line x1="1" y1="8" x2="15" y2="8" />
                  <line x1="1" y1="12.5" x2="15" y2="12.5" />
                </svg>
              )}
            </button>

            {menuOpen && (
              <div className="bl-global-nav-menu-panel">
                {/* Mobile-only: top links hidden from bar at <1024px */}
                <div className="bl-global-nav-menu-mobile-nav">
                  <Link to="/plan" className="bl-global-nav-menu-link" onClick={closeMenu}>{homeNav.navPlan}</Link>
                  <Link to="/map" className="bl-global-nav-menu-link" onClick={closeMenu}>{homeNav.navMap}</Link>
                  <Link to="/categories" className="bl-global-nav-menu-link" onClick={closeMenu}>{homeNav.navCategories}</Link>
                  <Link to="/guides" className="bl-global-nav-menu-link" onClick={closeMenu}>{homeNav.navGuides}</Link>
                </div>

                <div className="bl-global-nav-menu-divider" />
                <Link to="/recommendations" className="bl-global-nav-menu-link" onClick={closeMenu}>{homeNav.navMenuRecommendations}</Link>
                <Link to="/partners" className="bl-global-nav-menu-link" onClick={closeMenu}>{homeNav.navForVenues}</Link>
                <Link to="/privacy" className="bl-global-nav-menu-link" onClick={closeMenu}>{homeNav.navMenuPrivacy}</Link>
                <div className="bl-global-nav-menu-divider" />
                <Link
                  to={user ? "/account" : "/login"}
                  className="bl-global-nav-menu-link"
                  onClick={closeMenu}
                >
                  {user ? homeNav.navAccount : homeNav.navSignIn}
                </Link>
              </div>
            )}
          </div>

        </div>
      </nav>
    </header>
    </>
  );
}
