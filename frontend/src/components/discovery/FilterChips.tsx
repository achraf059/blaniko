type FilterChipOption = {
  value: string;
  label: string;
};

type FilterChipsProps = {
  options: FilterChipOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
};

export function FilterChips({ options, selectedValue, onSelect }: FilterChipsProps) {
  return (
    <div className="bl-discovery-chip-row">
      {options.map((option) => {
        const isSelected = option.value === selectedValue;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`bl-discovery-chip ${isSelected ? "is-selected" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
