import { useI18n } from "../i18n/useI18n";

type LanguageSwitcherProps = {
  labelEn: string;
  labelFr: string;
};

export function LanguageSwitcher({ labelEn, labelFr }: LanguageSwitcherProps) {
  const { language, setLanguage } = useI18n();

  return (
    <div
      role="group"
      aria-label="Language selector"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        border: "1px solid #d8cab6",
        borderRadius: 999,
        background: "#fffaf2",
        padding: "2px",
      }}
    >
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        style={{
          border: "none",
          background: language === "en" ? "#f2e7d5" : "transparent",
          color: "#334155",
          borderRadius: 999,
          padding: "4px 10px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {labelEn}
      </button>

      <button
        type="button"
        onClick={() => setLanguage("fr")}
        aria-pressed={language === "fr"}
        style={{
          border: "none",
          background: language === "fr" ? "#f2e7d5" : "transparent",
          color: "#334155",
          borderRadius: 999,
          padding: "4px 10px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {labelFr}
      </button>
    </div>
  );
}
