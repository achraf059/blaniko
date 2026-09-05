import { Component, type ErrorInfo, type ReactNode } from "react";
import "./ErrorBoundary.css";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
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
      return (
        <div className="bl-error-boundary" role="alert">
          <div className="bl-error-boundary-card">
            <p className="bl-error-boundary-eyebrow">Something went wrong</p>
            <h1 className="bl-error-boundary-title">
              This page ran into a problem
            </h1>
            <p className="bl-error-boundary-desc">
              An unexpected error occurred while rendering this page. Your data
              is safe — try recovering below or go back to the home page.
            </p>
            <div className="bl-error-boundary-actions">
              <button
                type="button"
                className="bl-error-boundary-btn-primary"
                onClick={this.handleReset}
              >
                Try again
              </button>
              <button
                type="button"
                className="bl-error-boundary-btn-secondary"
                onClick={this.handleReload}
              >
                Reload page
              </button>
              <a href="/" className="bl-error-boundary-btn-secondary">
                Go to home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
