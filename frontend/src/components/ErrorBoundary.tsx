import { Component, useContext, type ErrorInfo, type ReactNode } from "react";
import { I18nContext } from "../i18n/context";
import { getDictionary } from "../i18n/dictionaries";
import { DEFAULT_LANGUAGE } from "../i18n/types";
import "./ErrorBoundary.css";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

type ErrorFallbackProps = {
  onReset: () => void;
  onReload: () => void;
};

// ErrorBoundary itself must stay a class component (only classes support
// getDerivedStateFromError/componentDidCatch), so it cannot call hooks. This
// function component renders the fallback instead, purely so it can read the
// current language from context. It reads I18nContext directly rather than
// via useI18n() (which throws outside a provider) so the recovery UI can
// never itself fail to render for lack of translation context — it falls
// back to the default-language dictionary instead.
function ErrorFallback({ onReset, onReload }: ErrorFallbackProps) {
  const context = useContext(I18nContext);
  const dictionary = context?.dictionary ?? getDictionary(DEFAULT_LANGUAGE);
  const text = dictionary.errorBoundary;

  return (
    <div className="bl-error-boundary" role="alert">
      <div className="bl-error-boundary-card">
        <p className="bl-error-boundary-eyebrow">{text.eyebrow}</p>
        <h1 className="bl-error-boundary-title">{text.title}</h1>
        <p className="bl-error-boundary-desc">{text.description}</p>
        <div className="bl-error-boundary-actions">
          <button
            type="button"
            className="bl-error-boundary-btn-primary"
            onClick={onReset}
          >
            {dictionary.common.retry}
          </button>
          <button
            type="button"
            className="bl-error-boundary-btn-secondary"
            onClick={onReload}
          >
            {text.reload}
          </button>
          <a href="/" className="bl-error-boundary-btn-secondary">
            {text.goHome}
          </a>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("[Blaniko] Render error caught by ErrorBoundary:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={this.handleReset} onReload={this.handleReload} />;
    }

    return this.props.children;
  }
}
