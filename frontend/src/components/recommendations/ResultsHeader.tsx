type ResultsHeaderProps = {
  headline: string;
  summary: string;
  topCount: number;
  alternativesCount: number;
};

export function ResultsHeader({
  headline,
  summary,
  topCount,
  alternativesCount,
}: ResultsHeaderProps) {
  return (
    <section className="bl-reco-results-head">
      <p className="bl-reco-eyebrow">Personalized picks</p>
      <h1 className="bl-reco-title">{headline}</h1>
      <p className="bl-reco-subtitle">{summary}</p>
      <div className="bl-reco-results-meta">
        <span>{topCount} top recommendations</span>
        <span>{alternativesCount} alternatives</span>
      </div>
    </section>
  );
}
