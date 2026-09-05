import React from "react";
import { Link, useNavigate } from "react-router";
import { Icon } from "./Icon.jsx";
import { useI18n } from "../i18n/useI18n";
import { getHomeLandingLocalizedData } from "./data.js";

// Blaniko — Moods, Map preview, Editorial feature, Compare tray
export const Moods = () => {
  const navigate = useNavigate();
  const { language, dictionary } = useI18n();
  const { moods } = getHomeLandingLocalizedData(language);
  return (
    <section className="moods shell" id="moods">
      <div className="moods-head">{dictionary.homeLanding.moodsHead}</div>
      <div className="mood-grid">
        {moods.map(m => (
          <button key={m.title} className="mood" onClick={() => navigate(m.href)}>
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

export const MapPreview = () => {
  const navigate = useNavigate();
  const { language, dictionary } = useI18n();
  const { mapPins } = getHomeLandingLocalizedData(language);
  return (
    <section className="mapband shell" id="map">
      <div className="map-card">
        <div className="left">
          <div>
            <div className="eyebrow">{dictionary.homeLanding.mapEyebrow}</div>
            <h3>{dictionary.homeLanding.mapTitlePrefix} <em>{dictionary.homeLanding.mapTitleEmphasis}</em>, {dictionary.homeLanding.mapTitleSuffix}</h3>
          </div>
          <div className="map-meta">
            <span className="dot"><span className="swatch" style={{background:"var(--plum)"}}/>{dictionary.homeLanding.mapActivities}</span>
            <span className="dot"><span className="swatch" style={{background:"var(--heather)"}}/>{dictionary.homeLanding.mapNeighborhoods}</span>
          </div>
          <button className="open-map" onClick={() => navigate("/map")}>
            {dictionary.homeLanding.mapOpen}
            <Icon name="arrow" size={14} />
          </button>
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
            {mapPins.map(p => (
              <React.Fragment key={p.label}>
                <div
                  className="map-pin"
                  style={{ top: p.top + "%", left: p.left + "%" }}
                  title={p.label}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    navigate(`/map?area=${encodeURIComponent(p.areaQuery ?? p.label)}`)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/map?area=${encodeURIComponent(p.areaQuery ?? p.label)}`);
                    }
                  }}
                />
                <div
                  className="map-label"
                  style={{ top: (p.top - 6) + "%", left: p.left + "%" }}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    navigate(`/map?area=${encodeURIComponent(p.areaQuery ?? p.label)}`)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/map?area=${encodeURIComponent(p.areaQuery ?? p.label)}`);
                    }
                  }}
                >
                  {p.label}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export const Editorial = () => {
  const { language, dictionary } = useI18n();

  const chips = language === "fr"
    ? ["En famille", "En intérieur", "Soirée"]
    : ["Family-friendly", "Indoor", "Evening plan"];

  return (
    <section className="editorial shell">
      <div className="ed-card">
        <div className="ed-img">
          <img
            src="/images/home/family-cinema-night.webp"
            alt="Family enjoying a movie night in a cinema"
          />
        </div>
        <div className="ed-body">
          <div className="ed-eyebrow">{dictionary.homeLanding.editorialEyebrow}</div>
          <h3>
            {dictionary.homeLanding.editorialTitlePrefix}{" "}
            <em>{dictionary.homeLanding.editorialTitleEmphasis}</em>
          </h3>
          <p>{dictionary.homeLanding.editorialDescription}</p>
          <div className="ed-chips">
            {chips.map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
          </div>
          <Link to="/guides" className="ed-cta">
            {dictionary.homeLanding.editorialRead}
            <Icon name="arrow" size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export const CompareTray = ({ items, onClear }) => {
  const navigate = useNavigate();
  const { dictionary } = useI18n();
  const show = items.length >= 2;
  return (
    <div className={`compare-tray ${show ? "show" : ""}`}>
      <div className="avatars">
        {items.slice(0, 3).map((_, i) => (
          <div key={i} className="avatar" style={{background: ["var(--heather)","var(--plum)","var(--accent)"][i]}}/>
        ))}
      </div>
      <div>
        <div className="tray-label">{dictionary.homeLanding.compareLabel}</div>
        <div>{dictionary.homeLanding.compareSelected.replace("{count}", String(items.length))}</div>
      </div>
      <button className="clear" onClick={onClear}>{dictionary.homeLanding.compareClear}</button>
      <button className="go" onClick={() => navigate("/compare")}>
        {dictionary.homeLanding.compareGo}
        <Icon name="arrow" size={14} />
      </button>
    </div>
  );
};

