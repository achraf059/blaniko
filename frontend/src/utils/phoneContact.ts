/**
 * Derives a usable phone contact from a stored venue phone value.
 *
 * Why this exists:
 *  Some venue `phone` values in the V3 dataset are the literal placeholder
 *  "Unknown" (and others are empty or punctuation-only). Treating any truthy
 *  string as a real number renders Call / WhatsApp actions whose normalized dial
 *  value is empty, producing invalid `tel:` / `wa.me` destinations. This mirrors
 *  the opening-hours path, which already hides its "Unknown" placeholder.
 *
 * A contact is only available when the value yields a meaningful telephone
 * number. Unavailable (returns null) when the value is:
 *  - null / undefined;
 *  - empty or whitespace-only;
 *  - "Unknown", case-insensitively, with surrounding whitespace;
 *  - free of digits (e.g. punctuation-only, or plain text).
 *
 * When available, returns the two normalized forms used by the UI:
 *  - `tel`: digits with an optional leading "+", for a `tel:` href;
 *  - `wa`:  digits only (no "+"), for a `https://wa.me/` link.
 *
 * This never alters the venue object; it only returns a derived value.
 */
export interface PhoneContact {
  /** For `tel:` hrefs — digits, optionally prefixed with "+". */
  tel: string;
  /** For `wa.me/` links — digits only, no leading "+". */
  wa: string;
}

export function normalizePhoneContact(
  value: string | null | undefined
): PhoneContact | null {
  if (value == null) return null;

  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.toLowerCase() === "unknown") return null;

  // Digits only, dropping spaces, punctuation and any embedded "+".
  const digits = trimmed.replace(/\D/g, "");
  if (digits === "") return null;

  // Preserve an international "+" prefix when the original value carried one.
  const hasPlus = trimmed.startsWith("+");
  return {
    tel: hasPlus ? `+${digits}` : digits,
    wa: digits,
  };
}
