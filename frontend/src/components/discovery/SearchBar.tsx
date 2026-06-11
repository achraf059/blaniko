/**
 * SearchBar — unchanged API, but the magnifier is now an inline SVG (instead of
 * the 🔎 emoji) and the submit button carries an arrow, so it reads as premium.
 * Styled entirely by SearchPage.css (.bl-discovery-search*).
 */

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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      </button>
    </form>
  );
}
