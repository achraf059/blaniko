import { useI18n } from "../i18n/useI18n";
import "./LanguageSwitcher.css";

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
      className="bl-language-switcher"
    >
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        className={`bl-language-switcher-btn ${language === "en" ? "is-active" : ""}`}
      >
        {labelEn}
      </button>

      <button
        type="button"
        onClick={() => setLanguage("fr")}
        aria-pressed={language === "fr"}
        className={`bl-language-switcher-btn ${language === "fr" ? "is-active" : ""}`}
      >
        {labelFr}
      </button>
    </div>
  );
}
