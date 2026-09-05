import React from "react";
import "./data.js";
import { Nav } from "./Nav.jsx";
import { Hero } from "./Hero.jsx";
import { Editorial, CompareTray } from "./Features.jsx";
import { Categories, Curated, How, AboutSection, FooterCTA, Foot } from "./Sections.jsx";
import { useFavorites } from "../hooks/useFavorites";
import { useCompare } from "../hooks/useCompare";

// Blaniko — App root
const ACTIVE_PALETTE = "lavender";

const PALETTES = {
  lavender: { "--bg": "#FAF7FC", "--mist": "#E8DFF5", "--heather": "#B8A4D6", "--plum": "#6B4E8A", "--plum-deep": "#3D2966" },
  mauve:    { "--bg": "#F7F4F9", "--mist": "#EADFF2", "--heather": "#B499C9", "--plum": "#624577", "--plum-deep": "#351E4F" },
  dusk:     { "--bg": "#F4F1F7", "--mist": "#DED3EA", "--heather": "#A691C0", "--plum": "#513A6E", "--plum-deep": "#2A1A43" },
  warm:     { "--bg": "#FBF6F4", "--mist": "#EFDFE9", "--heather": "#C29CC0", "--plum": "#7A4F7A", "--plum-deep": "#4A2A4A" },
};

const App = () => {
  const { favoriteSlugs, toggleFavorite } = useFavorites();
  const { compareSlugs, toggleCompare, clearCompare } = useCompare();

  // Apply palette to :root — light mode only.
  // All PALETTES values are light-mode colours. Calling setProperty() writes
  // them as inline CSS custom properties on <html>, which have specificity
  // (1,0,0,0) and override *everything* in stylesheets — including the
  // [data-theme="dark"] variable block.  Skip in dark mode so the CSS
  // dark-mode token overrides can take control.
  React.useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    if (document.documentElement.getAttribute("data-theme") === "dark") {
      return;
    }

    const p = PALETTES[ACTIVE_PALETTE] || PALETTES.lavender;
    Object.entries(p).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
    });
  }, []);

  return (
    <>
      <Nav favoritesCount={favoriteSlugs.length} />
      <main id="main-content">
        <Hero />
        <Categories />
        <Curated
          favorites={favoriteSlugs}
          toggleFav={toggleFavorite}
        />
        <How />
        <Editorial />
        <AboutSection />
        <FooterCTA />
      </main>
      <Foot />

      <CompareTray items={compareSlugs} onClear={clearCompare} />
    </>
  );
};

export default App;
