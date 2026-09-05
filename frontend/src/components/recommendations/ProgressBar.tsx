type ProgressBarProps = {
  currentStep: number;
  totalSteps: number;
  ariaLabel: string;
  stepLabel: (current: number, total: number) => string;
};

export function ProgressBar({
  currentStep,
  totalSteps,
  ariaLabel,
  stepLabel,
}: ProgressBarProps) {
  const progress = Math.max(0, Math.min(100, (currentStep / totalSteps) * 100));

  return (
    <div className="bl-reco-progress-wrap" aria-label={ariaLabel}>
      <div className="bl-reco-progress-meta">
        <span>{stepLabel(Math.min(currentStep, totalSteps), totalSteps)}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="bl-reco-progress-track">
        <div className="bl-reco-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
