import React from "react";
const { Icon } = window;

// Blaniko — Moods, Map preview, Editorial feature, Compare tray
const Moods = () => {
  const moods = [
    { title: "Tonight", sub: "after 7pm", ico: "moon" },
    { title: "Under MAD 200", sub: "budget picks", ico: "coin" },
    { title: "Date night", sub: "for two", ico: "heart2" },
    { title: "With friends", sub: "3+ people", ico: "users" },
  ];
  return (
    <section className="moods shell" id="moods">
      <div className="moods-head">Find by mood</div>
      <div className="mood-grid">
        {moods.map(m => (
          <button key={m.title} className="mood">
            <div className="ico"><Icon name={m.ico} size={18} /></div>
            <div>
              <div className="mood-title">{m.title}</div>
              <div className="mood-sub">{m.sub}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

const MapPreview = () => {
  const pins = [
    { top: 38, left: 28, label: "Ain Diab" },
    { top: 52, left: 48, label: "Corniche" },
    { top: 30, left: 62, label: "Triangle d'Or" },
    { top: 64, left: 72, label: "Old Medina" },
    { top: 72, left: 40, label: "Anfa" },
    { top: 22, left: 45, label: "Sidi Bernoussi" },
  ];
  return (
    <section className="mapband shell" id="map">
      <div className="map-card">
        <div className="left">
          <div>
            <div className="eyebrow">06 — Map</div>
            <h3>See the city <em>as a map</em>, not a list.</h3>
          </div>
          <div className="map-meta">
            <span className="dot"><span className="swatch" style={{background:"var(--plum)"}}/>220 activities</span>
            <span className="dot"><span className="swatch" style={{background:"var(--heather)"}}/>12 neighborhoods</span>
          </div>
          <a href="#" className="open-map">
            Open map
            <Icon name="arrow" size={14} />
          </a>
        </div>
        <div className="right">
          {/* Stylized coastline suggestion */}
          <svg className="map-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="sea" x1="0" x2="0" y1="1" y2="0">
                <stop offset="0" stopColor="#C9B8E8" stopOpacity="0.4"/>
                <stop offset="1" stopColor="#E8DFF5" stopOpacity="0.1"/>
              </linearGradient>
            </defs>
            <path d="M0,220 C60,200 120,260 200,240 C280,220 340,270 400,250 L400,300 L0,300 Z" fill="url(#sea)"/>
            {/* soft neighborhood blobs */}
            <circle cx="120" cy="120" r="48" fill="#B8A4D6" opacity="0.18"/>
            <circle cx="230" cy="100" r="42" fill="#B8A4D6" opacity="0.22"/>
            <circle cx="290" cy="180" r="50" fill="#B8A4D6" opacity="0.15"/>
            <circle cx="180" cy="190" r="36" fill="#B8A4D6" opacity="0.2"/>
            {/* soft roads */}
            <path d="M40,150 C120,140 200,160 360,130" stroke="#6B4E8A" strokeWidth="0.6" fill="none" opacity="0.28" strokeDasharray="3 4"/>
            <path d="M80,80 C140,100 220,120 340,90" stroke="#6B4E8A" strokeWidth="0.6" fill="none" opacity="0.2" strokeDasharray="3 4"/>
          </svg>
          <div className="map-neighborhoods">
            {pins.map(p => (
              <React.Fragment key={p.label}>
                <div className="map-pin" style={{ top: p.top + "%", left: p.left + "%" }} title={p.label}/>
                <div className="map-label" style={{ top: (p.top - 6) + "%", left: p.left + "%" }}>{p.label}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const Editorial = () => (
  <section className="editorial shell">
    <div className="ed-card">
      <div className="ed-img"/>
      <div>
        <div className="ed-eyebrow">Weekly edit · Issue 14</div>
        <h3>A quiet guide to <em>autumn</em> in Casablanca.</h3>
        <p>
          Six spaces to slow down in, from a rooftop library above Maarif to a glassblower's
          studio in Bouskoura. Writing and photographs by our editors.
        </p>
        <div className="ed-foot">
          <span className="author"><span className="avatar-s"/>Leïla Bensaïd</span>
          <span>·</span>
          <span>6 min read</span>
        </div>
        <a href="#" className="read">
          Read the edit
          <Icon name="arrow" size={14} />
        </a>
      </div>
    </div>
  </section>
);

const CompareTray = ({ items, onClear }) => {
  const show = items.length >= 2;
  return (
    <div className={`compare-tray ${show ? "show" : ""}`}>
      <div className="avatars">
        {items.slice(0, 3).map((_, i) => (
          <div key={i} className="avatar" style={{background: ["var(--heather)","var(--plum)","var(--accent)"][i]}}/>
        ))}
      </div>
      <div>
        <div className="tray-label">Compare</div>
        <div>{items.length} activities selected</div>
      </div>
      <button className="clear" onClick={onClear}>Clear</button>
      <button className="go">
        Compare
        <Icon name="arrow" size={14} />
      </button>
    </div>
  );
};

Object.assign(window, { Moods, MapPreview, Editorial, CompareTray });
