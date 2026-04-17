type QuizOption = {
  value: string;
  label: string;
};

type QuizStepProps = {
  title: string;
  description?: string;
  options: QuizOption[];
  value: string;
  onChange: (value: string) => void;
};

export function QuizStep({ title, description, options, value, onChange }: QuizStepProps) {
  return (
    <section className="bl-reco-step">
      <h2 className="bl-reco-step-title">{title}</h2>
      {description ? <p className="bl-reco-step-description">{description}</p> : null}

      <div className="bl-reco-option-grid">
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              className={`bl-reco-option ${selected ? "is-selected" : ""}`}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
