type ProgressBarProps = {
  currentStep: number;
  totalSteps: number;
};

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const progress = Math.max(0, Math.min(100, (currentStep / totalSteps) * 100));

  return (
    <div className="bl-reco-progress-wrap" aria-label="Quiz progress">
      <div className="bl-reco-progress-meta">
        <span>
          Step {Math.min(currentStep, totalSteps)} of {totalSteps}
        </span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="bl-reco-progress-track">
        <div className="bl-reco-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
