type QuizOption = {
  value: string;
  label: string;
  description?: string;
  /** Full-width card — used for the odd trailing option (e.g. Family-friendly vibe). */
  wide?: boolean;
};

type QuizStepProps = {
  title: string;
  /** Short framing line under the question. */
  helper?: string;
  options: QuizOption[];
  value: string;
  onChange: (value: string) => void;
};

export function QuizStep({ title, helper, options, value, onChange }: QuizStepProps) {
  return (
    <section className="bl-reco-step">
      <h1 className="bl-reco-step-title">{title}</h1>
      {helper ? <p className="bl-reco-step-helper">{helper}</p> : null}

      <div className="bl-reco-option-grid">
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              className={`bl-reco-option${selected ? " is-selected" : ""}${
                option.wide ? " is-wide" : ""
              }`}
              onClick={() => onChange(option.value)}
            >
              <span className="bl-reco-option-body">
                <span className="bl-reco-option-title">{option.label}</span>
                {option.description ? (
                  <span className="bl-reco-option-desc">{option.description}</span>
                ) : null}
              </span>
              <span className="bl-reco-option-check" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
