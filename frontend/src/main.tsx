import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { HashScrollHandler } from "./components/HashScrollHandler";
import { I18nProvider } from "./i18n/I18nProvider";
import "./index.css";

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
