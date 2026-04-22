import React from "react";
const { Icon, CATEGORIES, CURATED } = window;

// Blaniko — Categories + Curated + How + Footer
const Categories = () => (
  <section className="categories shell" id="categories">
    <div className="section-head">
      <div>
        <div className="eyebrow">03 — Browse</div>
        <h2>Every mood <em>has a category</em>.</h2>
      </div>
      <div className="head-right">
        Nine ways into the city. Pick an entry point — or drift between them.
      </div>
    </div>
    <div className="cat-grid">
      {CATEGORIES.map(c => (
        <button key={c.name} className="cat">
          <div className="ico"><Icon name={c.ico} size={20} /></div>
          <div className="arrow"><Icon name="arrowUpRight" size={16} /></div>
          <div>
            <div className="name">{c.name}</div>
            <div className="count">{c.count}</div>
          </div>
        </button>
      ))}
    </div>
  </section>
);

const Curated = ({ favorites, toggleFav, compare, toggleCmp }) => {
  const row1 = CURATED.slice(0, 3);
  const row2 = CURATED.slice(3, 6);
  const renderCard = (a, wide) => {
    const id = a.title;
    const isFav = favorites.includes(id);
    const isCmp = compare.includes(id);
    return (
      <div key={id} className={`cur-card ${wide ? "wide" : ""}`}>
        <div className={`cur-img ${a.img}`}></div>
        <button
          className={`cmp-check ${isCmp ? "active" : ""}`}
          onClick={(e) => { e.stopPropagation(); toggleCmp(id); }}
          aria-label="Add to compare"
        >
          <span className="box">{isCmp && <Icon name="check" size={10} />}</span>
          Compare
        </button>
        <button
          className={`fav-btn ${isFav ? "active pulse" : ""}`}
          onClick={(e) => { e.stopPropagation(); toggleFav(id); }}
          aria-label="Save to favorites"
          onAnimationEnd={(e) => e.currentTarget.classList.remove("pulse")}
        >
          <Icon name={isFav ? "heartFill" : "heart"} size={16} />
        </button>
        <div className="cur-top">
          {a.chips.map(ch => <span key={ch} className="chip">{ch}</span>)}
        </div>
        <div className="cur-body">
          <div className="cur-title">{a.title}</div>
          <div className="cur-meta">
            <span>{a.price}</span>
            <span>{a.duration}</span>
          </div>
        </div>
      </div>
    );
  };
  return (
    <section className="curated shell" id="curated">
      <div className="section-head">
        <div>
          <div className="eyebrow">04 — Curated</div>
          <h2>The week's <em>picks</em>, chosen with care.</h2>
        </div>
        <div className="head-right">
          Editor-curated activities, updated every Monday. No pay-to-play.
        </div>
      </div>

      <div className="curated-grid">
        {row1.map((a, i) => renderCard(a, i === 0))}
      </div>

      <div className="curated-grid row-2">
        {row2.map((a, i) => renderCard(a, i === 2))}
      </div>
    </section>
  );
};

const How = () => (
  <section className="how shell" id="about">
    <div className="section-head" style={{ marginBottom: 56 }}>
      <div>
        <div className="eyebrow">05 — How it works</div>
        <h2>A simple <em>rhythm</em> — discover, choose, go.</h2>
      </div>
    </div>
    <div className="how-grid">
      <div className="how-item">
        <div className="num">01</div>
        <h4>Curated, not crawled.</h4>
        <p>Every activity is hand-picked by locals who've actually done it. No scraped listings, no filler.</p>
      </div>
      <div className="how-item">
        <div className="num">02</div>
        <h4>Clear, honest details.</h4>
        <p>Real prices, real durations, real photos — so you know what you're in for before you tap "go."</p>
      </div>
      <div className="how-item">
        <div className="num">03</div>
        <h4>Updated weekly.</h4>
        <p>The city changes. Our edit changes with it. New picks every Monday, right here.</p>
      </div>
    </div>
  </section>
);

const FooterCTA = () => (
  <section className="shell" id="join">
    <div className="footer-cta">
      <div className="footer-cta-inner">
        <h3>Find your <em>weekend</em>.</h3>
        <div>
          <div className="email">
            <input type="email" placeholder="your@email.com" />
            <button>Join the list</button>
          </div>
          <div className="small-note">One email a week · unsubscribe any time</div>
        </div>
      </div>
    </div>
  </section>
);

const Foot = () => (
  <footer className="shell foot">
    <div>© 2026 Blaniko · Made in Casablanca</div>
    <div className="foot-links">
      <a href="#">Instagram</a>
      <a href="#">Contact</a>
      <a href="#">Privacy</a>
    </div>
  </footer>
);

Object.assign(window, { Categories, Curated, How, FooterCTA, Foot });
