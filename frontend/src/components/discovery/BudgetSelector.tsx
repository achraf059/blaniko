type BudgetOption = {
  value: string;
  label: string;
};

type BudgetSelectorProps = {
  options: BudgetOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
};

export function BudgetSelector({
  options,
  selectedValue,
  onSelect,
}: BudgetSelectorProps) {
  return (
    <div className="bl-discovery-budget" role="group" aria-label="Budget selector">
      {options.map((option) => {
        const isSelected = option.value === selectedValue;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`bl-discovery-budget-item ${isSelected ? "is-selected" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
