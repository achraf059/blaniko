import React from "react";
import { Link, useNavigate } from "react-router";
import { Icon } from "./Icon.jsx";
import { useI18n } from "../i18n/useI18n";

// Blaniko — Nav
export const Nav = ({ favoritesCount = 0 }) => {
  const navigate = useNavigate();
  const { language, setLanguage, dictionary } = useI18n();
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
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
        <div className="nav-links">
          <a href="#explore">{dictionary.claudeHome.navExplore}</a>
          <a href="#categories">{dictionary.claudeHome.navCategories}</a>
          <a href="#curated">{dictionary.claudeHome.navCurated}</a>
          <a href="#map">{dictionary.claudeHome.navMap}</a>
        </div>
        <div className="nav-right">
          <button
            className="saved-pill"
            data-empty={favoritesCount === 0}
            onClick={() => navigate("/favorites")}
          >
            <Icon name={favoritesCount > 0 ? "heartFill" : "heart"} size={14} />
            {dictionary.claudeHome.saved}
            {favoritesCount > 0 && <span className="count">{favoritesCount}</span>}
          </button>
          <div className="lang-switch">
            {["EN", "FR", "AR"].map((label) => {
              const code = label.toLowerCase();
              const isSupported = code === "en" || code === "fr";
              const isActive = isSupported && language === code;

              return (
                <button
                  key={label}
                  className={`${isActive ? "active" : ""} ${!isSupported ? "is-disabled" : ""}`.trim()}
                  onClick={() => {
                    if (code === "en") {
                      setLanguage("en");
                    }

                    if (code === "fr") {
                      setLanguage("fr");
                    }
                  }}
                  disabled={!isSupported}
                  aria-disabled={!isSupported}
                  title={!isSupported ? dictionary.claudeHome.arComingSoon : undefined}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <a href="#join" className="nav-cta">{dictionary.claudeHome.joinList}</a>
        </div>
      </div>
    </nav>
  );
};

Object.assign(window, { Nav });
