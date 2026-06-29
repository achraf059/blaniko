import { useEffect } from "react";
import { useLocation } from "react-router";

const DEFAULT_TITLE = "Blaniko";
const DEFAULT_DESCRIPTION =
  "Discover the best things to do in Casablanca — activities, sports, gaming, outdoor plans, family outings and more.";

/**
 * Sets document.title, meta[name="description"], <link rel="canonical">,
 * and Open Graph url/title/description tags for the current page.
 * Uses the current pathname + search (no hash) as the canonical URL.
 * Restores defaults on unmount so navigating back doesn't leave stale metadata.
 */
export function usePageMeta(title: string, description?: string) {
  const location = useLocation();

  useEffect(() => {
    const pageTitle = title || DEFAULT_TITLE;
    const pageDescription = description ?? DEFAULT_DESCRIPTION;

    // Canonical URL: origin + pathname + search, no hash fragment
    const canonicalUrl =
      window.location.origin + location.pathname + location.search;

    // --- document title ---
    document.title = pageTitle;

    // --- meta description ---
    let metaDesc = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = pageDescription;

    // --- canonical link ---
    let canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    // --- og:url ---
    let ogUrl = document.querySelector<HTMLMetaElement>(
      'meta[property="og:url"]',
    );
    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.appendChild(ogUrl);
    }
    ogUrl.content = canonicalUrl;

    // --- og:title ---
    let ogTitle = document.querySelector<HTMLMetaElement>(
      'meta[property="og:title"]',
    );
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.appendChild(ogTitle);
    }
    ogTitle.content = pageTitle;

    // --- og:description ---
    let ogDesc = document.querySelector<HTMLMetaElement>(
      'meta[property="og:description"]',
    );
    if (!ogDesc) {
      ogDesc = document.createElement("meta");
      ogDesc.setAttribute("property", "og:description");
      document.head.appendChild(ogDesc);
    }
    ogDesc.content = pageDescription;

    return () => {
      document.title = DEFAULT_TITLE;

      const m = document.querySelector<HTMLMetaElement>(
        'meta[name="description"]',
      );
      if (m) m.content = DEFAULT_DESCRIPTION;

      const c = document.querySelector<HTMLLinkElement>(
        'link[rel="canonical"]',
      );
      if (c) c.href = window.location.origin + "/";

      const u = document.querySelector<HTMLMetaElement>(
        'meta[property="og:url"]',
      );
      if (u) u.content = window.location.origin + "/";

      const ot = document.querySelector<HTMLMetaElement>(
        'meta[property="og:title"]',
      );
      if (ot) ot.content = DEFAULT_TITLE;

      const od = document.querySelector<HTMLMetaElement>(
        'meta[property="og:description"]',
      );
      if (od) od.content = DEFAULT_DESCRIPTION;
    };
  }, [title, description, location.pathname, location.search]);
}
