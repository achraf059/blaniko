import React from "react";
import { useNavigate } from "react-router";
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
            onClick={() => navigate(`/categories/${c.slug}`)}
          >
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
        <div className={`cur-img ${a.img}`}></div>
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
    <section className="how shell" id="about">
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
  const { dictionary } = useI18n();
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState("idle"); // idle | submitting | success | error

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/\S+@\S+\.\S+/.test(trimmed)) {
      setStatus("error");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ "form-name": "waitlist", email: trimmed }).toString(),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="shell" id="join">
      <div className="footer-cta">
        <div className="footer-cta-inner">
          <h3>{dictionary.claudeHome.footerCtaTitlePrefix} <em>{dictionary.claudeHome.footerCtaTitleEmphasis}</em>.</h3>
          <div>
            {status === "success" ? (
              <div className="small-note">{dictionary.claudeHome.waitlistSuccess}</div>
            ) : (
              <form
                name="waitlist"
                data-netlify="true"
                onSubmit={handleSubmit}
                noValidate
              >
                <input type="hidden" name="form-name" value="waitlist" />
                <div className="email">
                  <input
                    type="email"
                    name="email"
                    placeholder={dictionary.claudeHome.footerEmailPlaceholder}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
                    disabled={status === "submitting"}
                  />
                  <button type="submit" disabled={status === "submitting"}>
                    {dictionary.claudeHome.joinList}
                  </button>
                </div>
                {status === "error" && (
                  <div className="small-note" style={{ marginTop: 10 }}>
                    {dictionary.claudeHome.waitlistError}
                  </div>
                )}
                {status !== "error" && (
                  <div className="small-note">{dictionary.claudeHome.footerSmallNote}</div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export const Foot = () => {
  const { language } = useI18n();
  const { footer } = getClaudeHomeLocalizedData(language);

  return (
    <footer className="shell foot">
      <div>{footer.madeIn}</div>
      <div className="foot-links">
        <a href="#">{footer.instagram}</a>
        <a href="#">{footer.contact}</a>
        <a href="#">{footer.privacy}</a>
      </div>
    </footer>
  );
};

Object.assign(window, { Categories, Curated, How, FooterCTA, Foot });
