/**
 * Normalizes a stored value into a safe outbound (external) URL for use in an
 * anchor href or window.open target.
 *
 * Why this exists:
 *  Some venue `website` values in the V3 dataset are bare domains with no URL
 *  scheme (e.g. "totemkidscoffee.com"). When such a value is placed directly in
 *  an anchor href, the browser treats it as an INTERNAL relative path instead of
 *  an external site. This helper produces a safe, absolute href at render time
 *  WITHOUT mutating the underlying stored value.
 *
 * Behavior:
 *  - null / undefined / empty (after trim) -> null
 *  - valid http:// or https:// -> preserved as-is
 *  - bare domain / domain+path (e.g. "example.com", "www.example.com/x") ->
 *    prefixed with "https://"
 *  - dangerous or unsupported schemes (javascript:, data:, vbscript:, file:,
 *    ftp:, mailto:, tel:, ...) -> null
 *  - arbitrary malformed strings that don't look like a domain -> null
 *
 * This never alters the venue object; it only returns a derived string.
 */
export function safeExternalUrl(
  value: string | null | undefined
): string | null {
  if (value == null) return null;

  const trimmed = value.trim();
  if (trimmed === "") return null;

  const colonIndex = trimmed.indexOf(":");
  if (colonIndex > -1) {
    const beforeColon = trimmed.slice(0, colonIndex);
    // A real URL scheme is letters/digits/+/- only (no dot, no slash).
    // "example.com:8080" is NOT a scheme (it has a dot) and falls through.
    const isScheme = /^[a-zA-Z][a-zA-Z0-9+-]*$/.test(beforeColon);
    if (isScheme) {
      const scheme = beforeColon.toLowerCase();
      if (scheme === "http" || scheme === "https") {
        // Require the exact authority form "http(s)://<host>": the char right
        // after "//" must start the host, not another slash. This rejects
        // "https://" (no host), "https:example.com" (no authority) and
        // repaired slash patterns like "https:///x" / "https:////x" that the
        // URL parser would otherwise silently normalize. Valid absolute URLs
        // are preserved verbatim.
        if (!/^https?:\/\/[^/]/i.test(trimmed)) return null;
        try {
          const parsed = new URL(trimmed);
          const isHttp =
            parsed.protocol === "http:" || parsed.protocol === "https:";
          return isHttp && parsed.hostname ? trimmed : null;
        } catch {
          return null;
        }
      }
      // javascript:, data:, vbscript:, file:, ftp:, mailto:, tel:, ...
      return null;
    }
    // Not a scheme — treat as a host:port style value and validate below.
  }

  // No (safe) scheme present. Only normalize values that look like a plain
  // domain or domain + path. Requires at least one dot in the host and a
  // valid host label, optionally with a port.
  const host = trimmed.split("/")[0];
  const looksLikeDomain =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+(:\d+)?$/.test(
      host
    );
  if (!looksLikeDomain) return null;

  return `https://${trimmed}`;
}
