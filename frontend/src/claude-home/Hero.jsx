import React from "react";
const { Icon, HERO_CARDS } = window;

// Blaniko — Hero + Scroll-linked floating cards
const Hero = () => {
  const [query, setQuery] = React.useState("");
  return (
    <section className="hero shell" id="hero">
      <div className="hero-eyebrow">
        <span className="coastline">
          <svg width="26" height="8" viewBox="0 0 26 8" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <path d="M1 5c2-3 4-3 6 0s4 3 6 0 4-3 6 0 4 3 6 0"/>
          </svg>
          Casablanca · MA
        </span>
        <span>34.02°N · 6.83°W</span>
      </div>

      <h1 className="hero-headline reveal in">
        Discover the <em>quietly&nbsp;extraordinary</em> in Casablanca.
      </h1>

      <p className="hero-sub reveal in" style={{ transitionDelay: "120ms" }}>
        A curated guide to the activities, workshops, and weekend plans that make
        the city feel like yours — chosen with taste, updated every week.
      </p>

      <div className="hero-search reveal in" style={{ transitionDelay: "240ms" }}>
        <Icon name="search" size={18} />
        <input
          placeholder="Surf, pottery, rooftop dinner…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="divider"/>
        <div className="where">
          <Icon name="pin" size={14} />
          Casablanca
        </div>
        <button className="go">
          Explore
          <Icon name="arrow" size={14} />
        </button>
      </div>

      <div className="hero-tags reveal in" style={{ transitionDelay: "360ms" }}>
        {["This weekend", "Outdoor", "Under MAD 200", "Date night", "With kids", "Tonight"].map(t => (
          <button key={t} className="tag">{t}</button>
        ))}
      </div>

      {/* Floating cards — data-card-id used for scroll mapping */}
      {HERO_CARDS.map((c, i) => (
        <div key={c.id} className={`float-card fc-${i + 1}`} data-card-id={c.id}>
          <div className={`img ${c.img}`}></div>
          <div className="meta">
            <div className="price">{c.price}</div>
            <div className="text-block">
              <div className="tagline">{c.tagline}</div>
              <div className="title">{c.title}</div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
};

Object.assign(window, { Hero });
