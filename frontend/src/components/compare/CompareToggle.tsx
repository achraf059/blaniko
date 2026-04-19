import { useState } from "react";
import { Link } from "react-router";
import { useCompare } from "../../hooks/useCompare";
import "./CompareToggle.css";

type CompareToggleProps = {
  venueSlug: string;
  compact?: boolean;
};

export function CompareToggle({ venueSlug, compact = false }: CompareToggleProps) {
  const { compareCount, isCompared, toggleCompare } = useCompare();
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
            setFeedback("Compare is limited to 3 venues.");
            window.setTimeout(() => setFeedback(""), 1800);
            return;
          }

          setFeedback(result === "added" ? "Added to compare." : "Removed from compare.");
          window.setTimeout(() => setFeedback(""), 1400);
        }}
        aria-pressed={compared}
      >
        {compared ? "✓ In compare" : "+ Compare"}
      </button>

      <Link to="/compare" className="bl-compare-toggle-link">
        Compare ({compareCount})
      </Link>

      {feedback ? <p className="bl-compare-toggle-feedback">{feedback}</p> : null}
    </div>
  );
}
