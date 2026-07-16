import React from "react";
import { Link, useNavigate } from "react-router";
import { Icon } from "./Icon.jsx";
import { getClaudeHomeLocalizedData } from "./data.js";
import { useI18n } from "../i18n/useI18n";

// Blaniko — Categories + Curated + How + Footer
export const Categories = () => {
  const navigate = useNavigate();
  const { language, dictionary } = useI18n();
  const { categories } = getClaudeHomeLocalizedData(language);

  return (
    <section className="categories shell" id="categories">
      <div className="section-head">
        <div>
          <div className="eyebrow">{dictionary.claudeHome.categoriesEyebrow}</div>
          <h2>{dictionary.claudeHome.categoriesTitlePrefix} <em>{dictionary.claudeHome.categoriesTitleEmphasis}</em>.</h2>
        </div>
        <div className="head-right">
          {dictionary.claudeHome.categoriesRight}
        </div>
      </div>
      <div className="cat-grid">
        {categories.map(c => (
          <button
            key={c.name}
            className="cat"
            onClick={() => navigate(c.href ?? `/categories/${c.slug}`)}
          >
            {c.img && (
              <div
                className="cat-bg"
                style={{ backgroundImage: `url(${c.img})` }}
              />
            )}
            <div className="arrow"><Icon name="arrowUpRight" size={16} /></div>
            <div className="cat-text">
              <div className="name">{c.name}</div>
              <div className="count">{c.count}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="cat-quiz-cta">
        <Link to="/recommendations" className="cat-quiz-cta-pill">
          <span className="cat-quiz-cta-prompt">{dictionary.claudeHome.categoriesNotSurePrompt}</span>
          <span className="cat-quiz-cta-action">{dictionary.claudeHome.categoriesNotSureCta}</span>
        </Link>
      </div>
    </section>
  );
};

export const Curated = ({ favorites, toggleFav }) => {
  const navigate = useNavigate();
  const { language, dictionary } = useI18n();
  const { curated } = getClaudeHomeLocalizedData(language);
  const row1 = curated.slice(0, 3);
  const row2 = curated.slice(3, 6);
  const renderCard = (a, wide) => {
    const id = a.venueSlug;
    const isFav = favorites.includes(id);
    return (
      <div
        key={id}
        className={`cur-card ${wide ? "wide" : ""}`}
        onClick={() => navigate(`/venues/${id}`)}
      >
        <div
          className={`cur-img ${a.img}`}
          style={a.imgPath ? { backgroundImage: `url(${a.imgPath})` } : undefined}
        ></div>
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
            <span>{a.duration}</span>
          </div>
        </div>
      </div>
    );
  };
  return (
    <section className="curated shell" id="picks">
      <div className="section-head">
        <div>
          <div className="eyebrow">{dictionary.claudeHome.curatedEyebrow}</div>
          <h2>{dictionary.claudeHome.curatedTitlePrefix} <em>{dictionary.claudeHome.curatedTitleEmphasis}</em>, {dictionary.claudeHome.curatedTitleSuffix}</h2>
        </div>
        <div className="head-right">
          {dictionary.claudeHome.curatedRight}
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

export const How = () => {
  const { language, dictionary } = useI18n();
  const { howSteps } = getClaudeHomeLocalizedData(language);

  return (
    <section className="how shell" id="how">
      <div className="section-head" style={{ marginBottom: 56 }}>
        <div>
          <div className="eyebrow">{dictionary.claudeHome.howEyebrow}</div>
          <h2>{dictionary.claudeHome.howTitlePrefix} <em>{dictionary.claudeHome.howTitleEmphasis}</em> — {dictionary.claudeHome.howTitleSuffix}</h2>
        </div>
      </div>
      <div className="how-grid">
        {howSteps.map((step, index) => (
          <div key={step.title} className="how-item">
            <div className="num">{String(index + 1).padStart(2, "0")}</div>
            <h4>{step.title}</h4>
            <p>{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export const FooterCTA = () => {
  const { language, dictionary } = useI18n();
  const [email, setEmail] = React.useState("");
  // idle | submitting | success | duplicate | invalid_email | error
  const [status, setStatus] = React.useState("idle");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("invalid_email");
      return;
    }
    setStatus("submitting");
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiUrl}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          source: "homepage_footer",
          language: language || "en",
          page: window.location.pathname || "/",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setStatus("success");
      } else if (data.error === "already_subscribed") {
        setStatus("duplicate");
      } else if (data.error === "invalid_email") {
        setStatus("invalid_email");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const ch = dictionary.claudeHome;
  const inlineError =
    status === "invalid_email" ? ch.waitlistInvalidEmail :
    status === "duplicate" ? ch.waitlistDuplicate :
    status === "error" ? ch.waitlistError :
    null;

  return (
    <section className="shell" id="join">
      <div className="footer-cta">
        <div className="footer-cta-inner">
          <div className="footer-cta-copy">
            <h3>{ch.footerCtaTitlePrefix} <em>{ch.footerCtaTitleEmphasis}</em>.</h3>
            <p className="footer-cta-subtitle">{ch.footerCtaSubtitle}</p>
          </div>
          <div className="footer-cta-form">
            {status === "success" ? (
              <div className="footer-success">
                <div className="footer-success-icon">✓</div>
                <p className="footer-success-msg">{ch.waitlistSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="email">
                  <input
                    type="email"
                    name="email"
                    aria-label={ch.footerEmailPlaceholder}
                    placeholder={ch.footerEmailPlaceholder}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
                    disabled={status === "submitting"}
                  />
                  <button type="submit" disabled={status === "submitting"}>
                    {status === "submitting" ? ch.waitlistJoining : ch.joinList}
                  </button>
                </div>
                {inlineError ? (
                  <div className="small-note error" role="alert">
                    {inlineError}
                  </div>
                ) : (
                  <div className="small-note">
                    {ch.footerSmallNote}{" "}
                    <Link to="/privacy" className="footer-privacy-note-link">{ch.footerPrivacyLink}</Link>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export const AboutSection = () => {
  const { dictionary } = useI18n();
  const ch = dictionary.claudeHome;

  return (
    <section className="about-section shell" id="about">
      <div className="section-head">
        <div>
          <div className="eyebrow">{ch.aboutEyebrow}</div>
          <h2>{ch.aboutTitlePrefix} <em>{ch.aboutTitleEmphasis}</em></h2>
        </div>
      </div>
      <p className="about-body">{ch.aboutBody}</p>
    </section>
  );
};

export const Foot = () => {
  const { language, dictionary } = useI18n();
  const { footer } = getClaudeHomeLocalizedData(language);

  return (
    <footer className="shell foot">
      <div>{footer.madeIn}</div>
      <div className="foot-links">
        <a href="/#about" className="foot-about-link">{footer.about}</a>
        <Link to="/privacy" className="foot-about-link">{dictionary.claudeHome.footerPrivacyLink}</Link>
        <Link to="/partners" className="foot-about-link">{dictionary.claudeHome.footerForVenues}</Link>
      </div>
    </footer>
  );
};

