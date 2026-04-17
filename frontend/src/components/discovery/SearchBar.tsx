type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  submitLabel: string;
};

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder,
  submitLabel,
}: SearchBarProps) {
  return (
    <form
      className="bl-discovery-search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <span className="bl-discovery-search-icon" aria-hidden="true">
        🔎
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bl-discovery-search-input"
        placeholder={placeholder}
      />
      <button type="submit" className="bl-discovery-search-button">
        {submitLabel}
      </button>
    </form>
  );
}
