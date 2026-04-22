import React from "react";
const { Icon } = window;

// Blaniko — Nav
const Nav = ({ favoritesCount = 0 }) => {
  const [scrolled, setScrolled] = React.useState(false);
  const [lang, setLang] = React.useState("EN");
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
      <div className="shell nav-inner">
        <a href="#" className="wordmark" aria-label="Blaniko">
          <span className="wordmark-dot"/>
          Blaniko
        </a>
        <div className="nav-links">
          <a href="#explore">Explore</a>
          <a href="#categories">Categories</a>
          <a href="#curated">Curated</a>
          <a href="#map">Map</a>
        </div>
        <div className="nav-right">
          <button className="saved-pill" data-empty={favoritesCount === 0}>
            <Icon name={favoritesCount > 0 ? "heartFill" : "heart"} size={14} />
            Saved
            {favoritesCount > 0 && <span className="count">{favoritesCount}</span>}
          </button>
          <div className="lang-switch">
            {["EN", "FR", "AR"].map(L => (
              <button key={L} className={lang === L ? "active" : ""} onClick={() => setLang(L)}>{L}</button>
            ))}
          </div>
          <a href="#join" className="nav-cta">Join the list</a>
        </div>
      </div>
    </nav>
  );
};

Object.assign(window, { Nav });
