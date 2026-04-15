import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router";
import App from "./App";
import { I18nProvider } from "./i18n/I18nProvider";
import "./index.css";

function HashScrollHandler() {
  const location = useLocation();

  React.useEffect(() => {
    if (!location.hash) {
      return;
    }

    const id = decodeURIComponent(location.hash.replace("#", ""));

    const timeout = window.setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ block: "start" });
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [location.pathname, location.hash]);

  return null;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <HashScrollHandler />
        <App />
      </BrowserRouter>
    </I18nProvider>
  </React.StrictMode>
);
