import React from "react";
import { useNavigate } from "react-router";
import { Icon } from "./Icon.jsx";
import { getClaudeHomeLocalizedData } from "./data.js";
import { useI18n } from "../i18n/useI18n";

// Blaniko — Hero + Scroll-linked floating cards
export const Hero = () => {
  const navigate = useNavigate();
  const { language, dictionary } = useI18n();
  const { heroCards } = getClaudeHomeLocalizedData(language);
  const [query, setQuery] = React.useState("");
  const tags = [
    { label: dictionary.claudeHome.heroTagWeekend,  icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { label: dictionary.claudeHome.heroTagUnder200, icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    { label: dictionary.claudeHome.heroTagDateNight, icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
    { label: dictionary.claudeHome.heroTagWithKids, icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg> },
    { label: dictionary.claudeHome.heroTagTonight,  icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> },
  ];
  const tagLinks = {
    [dictionary.claudeHome.heroTagWeekend]:  "/categories",
    [dictionary.claudeHome.heroTagUnder200]: "/categories",
    [dictionary.claudeHome.heroTagDateNight]:"/categories?bestFor=date-spot",
    [dictionary.claudeHome.heroTagWithKids]: "/categories/family",
    [dictionary.claudeHome.heroTagTonight]:  "/categories",
  };

  const handleSearch = () => {
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/categories?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate("/categories");
    }
  };
  return (
    <section className="hero shell" id="hero">
      <div className="hero-eyebrow">
        <span className="coastline">
          <svg width="26" height="8" viewBox="0 0 26 8" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <path d="M1 5c2-3 4-3 6 0s4 3 6 0 4-3 6 0 4 3 6 0"/>
          </svg>
          {dictionary.claudeHome.heroEyebrowCity}
        </span>
        <span>33.57°N · 7.59°W</span>
      </div>

      <h1 className="hero-headline reveal in">
        {dictionary.claudeHome.heroHeadlinePrefix}{" "}
        <em>{dictionary.claudeHome.heroHeadlineEmphasis}</em>{" "}
        {dictionary.claudeHome.heroHeadlineSuffix}
      </h1>

      <p className="hero-sub reveal in" style={{ transitionDelay: "120ms" }}>
        {dictionary.claudeHome.heroSubtitle}
      </p>

      <div className="hero-search reveal in" style={{ transitionDelay: "240ms" }}>
        <Icon name="search" size={18} />
        <input
          placeholder={dictionary.claudeHome.heroSearchPlaceholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSearch();
            }
          }}
        />
        <div className="divider"/>
        <div className="where">
          <Icon name="pin" size={14} />
          Casablanca
        </div>
        <button className="go" onClick={handleSearch}>
          {dictionary.claudeHome.heroStartPlanning}
          <Icon name="arrow" size={14} />
        </button>
      </div>

      <div className="hero-secondary-cta reveal in" style={{ transitionDelay: "300ms" }}>
        <button className="hero-planner-link" onClick={() => navigate("/plan")}>
          {dictionary.claudeHome.heroTryPlanner}
          <Icon name="arrow" size={12} />
        </button>
      </div>

      <div className="hero-tags reveal in" style={{ transitionDelay: "360ms" }}>
        {tags.map(({ label, icon }) => (
          <button key={label} className="tag" onClick={() => navigate(tagLinks[label] ?? "/categories")}>
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Floating cards — data-card-id used for scroll mapping */}
      {heroCards.map((c, i) => (
        <div
          key={c.id}
          className={`float-card fc-${i + 1}`}
          data-card-id={c.id}
          onClick={() => navigate(`/venues/${c.venueSlug}`)}
          role="link"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              navigate(`/venues/${c.venueSlug}`);
            }
          }}
        >
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

