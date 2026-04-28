import { useEffect } from "react";
import { useLocation } from "react-router";

export function HashScrollHandler() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      // Scroll to top on pathname change (not on search/filter param changes).
      // Use setTimeout to ensure it runs after React DOM updates.
      const timeout = window.setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }, 0);
      return () => window.clearTimeout(timeout);
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
