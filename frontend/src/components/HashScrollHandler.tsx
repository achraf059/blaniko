import { useEffect } from "react";
import { useLocation } from "react-router";

export function HashScrollHandler() {
  const location = useLocation();

  useEffect(() => {
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
