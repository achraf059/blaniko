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
    dictionary.claudeHome.heroTagWeekend,
    dictionary.claudeHome.heroTagOutdoor,
    dictionary.claudeHome.heroTagUnder200,
    dictionary.claudeHome.heroTagDateNight,
    dictionary.claudeHome.heroTagWithKids,
    dictionary.claudeHome.heroTagTonight,
  ];
  const tagLinks = {
    [dictionary.claudeHome.heroTagWeekend]: "/search",
    [dictionary.claudeHome.heroTagOutdoor]: "/search?category=outdoor",
    [dictionary.claudeHome.heroTagUnder200]: "/search?budget=$",
    [dictionary.claudeHome.heroTagDateNight]: "/search?bestFor=date-spot",
    [dictionary.claudeHome.heroTagWithKids]: "/search?category=family",
    [dictionary.claudeHome.heroTagTonight]: "/search?mood=social",
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }
    const suffix = params.toString();
    navigate(suffix ? `/search?${suffix}` : "/search");
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
          {dictionary.claudeHome.heroExplore}
          <Icon name="arrow" size={14} />
        </button>
      </div>

      <div className="hero-tags reveal in" style={{ transitionDelay: "360ms" }}>
        {tags.map(t => (
          <button key={t} className="tag" onClick={() => navigate(tagLinks[t] ?? "/search")}>{t}</button>
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

Object.assign(window, { Hero });
