import { useState } from "react";
import { Link } from "react-router";
import { useCompare } from "../../hooks/useCompare";
import { getFlowTexts } from "../../i18n/flowTexts";
import { useI18n } from "../../i18n/useI18n";
import "./CompareToggle.css";

type CompareToggleProps = {
  venueSlug: string;
  compact?: boolean;
};

export function CompareToggle({
  venueSlug,
  compact = false,
}: CompareToggleProps) {
  const { compareCount, isCompared, toggleCompare } = useCompare();
  const { language } = useI18n();
  const text = getFlowTexts(language);
  const [feedback, setFeedback] = useState("");

  const compared = isCompared(venueSlug);

  return (
    <div className={`bl-compare-toggle${compact ? " is-compact" : ""}`}>
      <button
        type="button"
        className={`bl-compare-toggle-btn${compared ? " is-active" : ""}`}
        onClick={() => {
          const result = toggleCompare(venueSlug);

          if (result === "limit") {
            setFeedback(
              language === "fr"
                ? "La comparaison est limitée à 3 lieux."
                : "Compare is limited to 3 venues.",
            );
            window.setTimeout(() => setFeedback(""), 1800);
            return;
          }

          setFeedback(
            result === "added"
              ? language === "fr"
                ? "Ajouté à la comparaison."
                : "Added to compare."
              : language === "fr"
                ? "Retiré de la comparaison."
                : "Removed from compare.",
          );
          window.setTimeout(() => setFeedback(""), 1400);
        }}
        aria-pressed={compared}
      >
        {compared
          ? language === "fr"
            ? "✓ Dans la comparaison"
            : "✓ In compare"
          : `+ ${text.common.compare}`}
      </button>

      <Link to="/compare" className="bl-compare-toggle-link">
        {`${text.common.compare} (${compareCount})`}
      </Link>

      {feedback ? (
        <p className="bl-compare-toggle-feedback">{feedback}</p>
      ) : null}
    </div>
  );
}
