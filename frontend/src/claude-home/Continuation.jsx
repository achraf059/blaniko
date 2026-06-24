// TODO: V1 — Continuation collage section (4-slot editorial grid). Not rendered on homepage.
// Placeholder slots need real image data before this can be shown. Hold for V1.
import React from "react";
import { Link } from "react-router";
import { Icon } from "./Icon.jsx";
import { useI18n } from "../i18n/useI18n";
import { getClaudeHomeLocalizedData } from "./data.js";

// Blaniko — Section 2: Collage continuation
export const Continuation = () => {
  const { language, dictionary } = useI18n();
  const { continuationSlots } = getClaudeHomeLocalizedData(language);

  return (
    <section className="continuation shell" id="explore">
      <div className="continuation-head">
        <div className="left">
          <div style={{ marginBottom: 12 }}>{dictionary.claudeHome.continuationEyebrow}</div>
          <h2>
            {dictionary.claudeHome.continuationTitlePrefix} <em>{dictionary.claudeHome.continuationTitleEmphasis}</em> — {dictionary.claudeHome.continuationTitleSuffix}
          </h2>
        </div>
        <div className="right">
          {dictionary.claudeHome.continuationRight}
        </div>
      </div>

      <div className="collage">
        <div className="slot slot-1" data-slot-for="c1" data-label={continuationSlots[0]}/>
        <div className="slot slot-2" data-slot-for="c2" data-label={continuationSlots[1]}/>
        <div className="slot slot-3" data-slot-for="c3" data-label={continuationSlots[2]}/>
        <div className="slot slot-4" data-slot-for="c4" data-label={continuationSlots[3]}/>

        <div className="slot-copy">
          <div className="small">{dictionary.claudeHome.continuationCardLabel}</div>
          <h3>{dictionary.claudeHome.continuationCardTitle}</h3>
          <p>
            {dictionary.claudeHome.continuationCardDescription}
          </p>
          <Link to="/guides" className="link">
            {dictionary.claudeHome.continuationCta}
            <Icon name="arrow" size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
};
