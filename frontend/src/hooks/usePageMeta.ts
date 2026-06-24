import { useEffect } from "react";

const DEFAULT_TITLE = "Blaniko";
const DEFAULT_DESCRIPTION =
  "Discover the best things to do in Casablanca — activities, sports, gaming, outdoor plans, family outings and more.";

/**
 * Sets document.title and the meta[name="description"] tag for the current page.
 * Restores defaults on unmount so navigating back doesn't leave stale titles.
 */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title || DEFAULT_TITLE;

    const content = description ?? DEFAULT_DESCRIPTION;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = content;

    return () => {
      document.title = DEFAULT_TITLE;
      const m = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (m) m.content = DEFAULT_DESCRIPTION;
    };
  }, [title, description]);
}
