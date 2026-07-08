import React from "react";
import { Link, useNavigate } from "react-router";
import { Icon } from "./Icon.jsx";
import { useI18n } from "../i18n/useI18n";
import { useTheme } from "../hooks/useTheme";
import { AuthContext } from "../auth/AuthProvider";

// Blaniko — Homepage Nav
// Top links are homepage scroll anchors. Product routes live in the hamburger.
export const Nav = ({ favoritesCount = 0 }) => {
  const navigate = useNavigate();
  const { language, setLanguage, dictionary } = useI18n();
  const homeNav = dictionary.claudeHome;
  const { theme, toggleTheme } = useTheme();
  const auth = React.useContext(AuthContext);
  const user = auth?.user ?? null;
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
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
    <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
      <div className="shell nav-inner">
        <Link
          to="/"
          className="wordmark"
          aria-label="Blaniko"
          onClick={(e) => {
            e.preventDefault();
            navigate("/", { replace: true });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <img src="/brand/blaniko-wordmark.png" alt="Blaniko" />
        </Link>

        {/* Homepage scroll anchors — hidden below 1080px via .nav-links rule */}
        <div className="nav-links">
          <a href="#hero">{homeNav.navExplore}</a>
          <a href="#categories">{homeNav.navCategories}</a>
          <a href="#picks">{homeNav.navCurated}</a>
          <a href="#join">{homeNav.navContact}</a>
        </div>

        <div className="nav-right-group">
          <div className="nav-utility-group">
          <button
            className="saved-pill"
            data-empty={favoritesCount === 0}
            onClick={() => navigate("/favorites")}
          >
            <Icon name={favoritesCount > 0 ? "heartFill" : "heart"} size={14} />
            {homeNav.saved}
            {favoritesCount > 0 && <span className="count">{favoritesCount}</span>}
          </button>

          <Link
            to={user ? "/account" : "/login"}
            className={`nav-auth-pill${user ? "" : " is-guest"}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            {user ? homeNav.navAccount : homeNav.navSignIn}
          </Link>

          <div className="lang-switch">
            {["EN", "FR"].map((label) => {
              const code = label.toLowerCase();
              const isActive = language === code;
              return (
                <button
                  key={label}
                  className={isActive ? "active" : ""}
                  onClick={() => setLanguage(code)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            className="nav-theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? homeNav.navThemeToLight : homeNav.navThemeToDark}
            title={theme === "dark" ? homeNav.navThemeToLight : homeNav.navThemeToDark}
          >
            {theme === "dark" ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2"    x2="12" y2="4.5"  />
                <line x1="12" y1="19.5" x2="12" y2="22"   />
                <line x1="4.22"  y1="4.22"  x2="5.87"  y2="5.87"  />
                <line x1="18.13" y1="18.13" x2="19.78" y2="19.78" />
                <line x1="2"    y1="12" x2="4.5"  y2="12" />
                <line x1="19.5" y1="12" x2="22"   y2="12" />
                <line x1="4.22"  y1="19.78" x2="5.87"  y2="18.13" />
                <line x1="18.13" y1="5.87"  x2="19.78" y2="4.22"  />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Hamburger — product routes (not homepage sections) */}
          <div className="nav-hamburger-wrap" ref={menuRef}>
            <button
              className="nav-hamburger"
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
              <div className="nav-menu-panel">
                <p className="nav-menu-section">{homeNav.navMenuExploreBlaniko}</p>
                <Link to="/categories" className="nav-menu-link" onClick={closeMenu}>{homeNav.navCategories}</Link>
                <Link to="/guides" className="nav-menu-link" onClick={closeMenu}>{homeNav.navGuides}</Link>
                <Link to="/plan" className="nav-menu-link" onClick={closeMenu}>{homeNav.navPlan}</Link>
                <Link to="/map" className="nav-menu-link" onClick={closeMenu}>{homeNav.navMap}</Link>
                <Link to="/recommendations" className="nav-menu-link" onClick={closeMenu}>{homeNav.navMenuRecommendations}</Link>

                <div className="nav-menu-divider" />

                <p className="nav-menu-section">{homeNav.navMenuMore}</p>
                <Link to="/partners" className="nav-menu-link" onClick={closeMenu}>{homeNav.navForVenues}</Link>
                <Link to="/privacy" className="nav-menu-link" onClick={closeMenu}>{homeNav.navMenuPrivacy}</Link>

                <div className="nav-menu-divider" />

                <Link to="/favorites" className="nav-menu-link" onClick={closeMenu}>
                  {homeNav.saved}{favoritesCount > 0 ? ` (${favoritesCount})` : ""}
                </Link>
                <Link
                  to={user ? "/account" : "/login"}
                  className="nav-menu-link"
                  onClick={closeMenu}
                >
                  {user ? homeNav.navAccount : homeNav.navSignIn}
                </Link>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </nav>
    </>
  );
};

