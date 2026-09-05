type ResultsHeaderProps = {
  eyebrow: string;
  headline: string;
  summary: string;
  topCount: number;
  alternativesCount: number;
  topCountLabel: (count: number) => string;
  alternativesCountLabel: (count: number) => string;
};

export function ResultsHeader({
  eyebrow,
  headline,
  summary,
  topCount,
  alternativesCount,
  topCountLabel,
  alternativesCountLabel,
}: ResultsHeaderProps) {
  return (
    <section className="bl-reco-results-head">
      <p className="bl-reco-eyebrow">{eyebrow}</p>
      <h1 className="bl-reco-title">{headline}</h1>
      <p className="bl-reco-subtitle">{summary}</p>
      <div className="bl-reco-results-meta">
        <span>{topCountLabel(topCount)}</span>
        <span>{alternativesCountLabel(alternativesCount)}</span>
      </div>
    </section>
  );
}
