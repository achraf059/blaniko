import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { HashScrollHandler } from "./components/HashScrollHandler";
import { I18nProvider } from "./i18n/I18nProvider";
import { ThemeProvider } from "./hooks/useTheme";
import { AuthProvider } from "./auth/AuthProvider";
// claude-home/styles.css is imported here (before index.css and all page CSS)
// so it always lands at a consistent, predictable position in the CSS cascade
// regardless of which page the user navigates to first. Without this, Vite dev
// mode injects it at an unpredictable position depending on navigation order,
// which can cause its body/html background rules to land after index.css and
// produce incorrect dark-mode backgrounds.
import "./claude-home/styles.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
        <BrowserRouter>
          <HashScrollHandler />
          <App />
        </BrowserRouter>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
