import React from "react";
import "./data.js";
import { Nav } from "./Nav.jsx";
import { Hero } from "./Hero.jsx";
import { Continuation } from "./Continuation.jsx";
import { Moods, MapPreview, Editorial, CompareTray } from "./Features.jsx";
import { Categories, Curated, How, FooterCTA, Foot } from "./Sections.jsx";
import { useFavorites } from "../hooks/useFavorites";
import { useCompare } from "../hooks/useCompare";

// Blaniko — App root + Tweaks panel
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "lavender",
  "accent": "plum",
  "heroStyle": "editorial",
  "casablancaCue": "subtle"
}/*EDITMODE-END*/;

const PALETTES = {
  lavender: { "--bg": "#FAF7FC", "--mist": "#E8DFF5", "--heather": "#B8A4D6", "--plum": "#6B4E8A", "--plum-deep": "#3D2966" },
  mauve:    { "--bg": "#F7F4F9", "--mist": "#EADFF2", "--heather": "#B499C9", "--plum": "#624577", "--plum-deep": "#351E4F" },
  dusk:     { "--bg": "#F4F1F7", "--mist": "#DED3EA", "--heather": "#A691C0", "--plum": "#513A6E", "--plum-deep": "#2A1A43" },
  warm:     { "--bg": "#FBF6F4", "--mist": "#EFDFE9", "--heather": "#C29CC0", "--plum": "#7A4F7A", "--plum-deep": "#4A2A4A" },
};

const App = () => {
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [tweaks, setTweaks] = React.useState(TWEAK_DEFAULTS);
  const { favoriteSlugs, toggleFavorite } = useFavorites();
  const { compareSlugs, toggleCompare, clearCompare } = useCompare();

  // Listen for host tweaks activation
  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onMsg = (e) => {
      if (!e.data) return;
      if (e.data.type === "__activate_edit_mode") setTweaksOpen(true);
      if (e.data.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };

    window.addEventListener("message", onMsg);

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    }

    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Apply palette to :root
  React.useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const p = PALETTES[tweaks.palette] || PALETTES.lavender;
    Object.entries(p).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
    });
  }, [tweaks.palette]);

  const setTweak = (k, v) => {
    const next = { ...tweaks, [k]: v };
    setTweaks(next);
    if (typeof window !== "undefined" && window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [k]: v } }, "*");
    }
    // Re-measure scroll motion after layout changes
    if (typeof window !== "undefined") {
      setTimeout(() => window.__blanikoScroll?.measure(), 60);
    }
  };

  return (
    <>
      <Nav favoritesCount={favoriteSlugs.length} />
      <main>
        <Hero />
        <Continuation />
        <Moods />
        <Categories />
        <Editorial />
        <Curated
          favorites={favoriteSlugs}
          toggleFav={toggleFavorite}
        />
        <MapPreview />
        <How />
        <FooterCTA />
      </main>
      <Foot />

      <CompareTray items={compareSlugs} onClear={clearCompare} />

      <div className={`tweaks ${tweaksOpen ? "open" : ""}`}>
        <h4>Tweaks</h4>

        <div className="group">
          <div className="group-label">Palette</div>
          <div className="opts">
            {Object.keys(PALETTES).map(p => (
              <button key={p}
                className={`opt ${tweaks.palette === p ? "active" : ""}`}
                onClick={() => setTweak("palette", p)}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="group">
          <div className="group-label">Casablanca cue</div>
          <div className="opts">
            {["off", "subtle", "bold"].map(c => (
              <button key={c}
                className={`opt ${tweaks.casablancaCue === c ? "active" : ""}`}
                onClick={() => setTweak("casablancaCue", c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="group">
          <div className="group-label">Hero feel</div>
          <div className="opts">
            {["editorial", "showcase", "calm"].map(h => (
              <button key={h}
                className={`opt ${tweaks.heroStyle === h ? "active" : ""}`}
                onClick={() => setTweak("heroStyle", h)}>
                {h}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default App;
