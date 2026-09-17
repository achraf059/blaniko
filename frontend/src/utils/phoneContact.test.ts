import { describe, it, expect } from "vitest";
import { normalizePhoneContact } from "./phoneContact";

describe("normalizePhoneContact", () => {
  it("keeps a valid Moroccan phone usable", () => {
    const contact = normalizePhoneContact("05 22 12 34 56");
    expect(contact).toEqual({ tel: "0522123456", wa: "0522123456" });
  });

  it("keeps a + prefixed international phone usable", () => {
    const contact = normalizePhoneContact("+212 5 22 12 34 56");
    expect(contact).toEqual({ tel: "+212522123456", wa: "212522123456" });
  });

  it("treats undefined as unavailable", () => {
    expect(normalizePhoneContact(undefined)).toBeNull();
  });

  it("treats null as unavailable", () => {
    expect(normalizePhoneContact(null)).toBeNull();
  });

  it("treats an empty string as unavailable", () => {
    expect(normalizePhoneContact("")).toBeNull();
  });

  it("treats a whitespace-only string as unavailable", () => {
    expect(normalizePhoneContact("   ")).toBeNull();
  });

  it('treats "Unknown" as unavailable', () => {
    expect(normalizePhoneContact("Unknown")).toBeNull();
  });

  it("treats case/whitespace variants of unknown as unavailable", () => {
    expect(normalizePhoneContact(" unknown ")).toBeNull();
    expect(normalizePhoneContact("UNKNOWN")).toBeNull();
    expect(normalizePhoneContact("UnKnOwN")).toBeNull();
  });

  it("treats punctuation-only input as unavailable", () => {
    expect(normalizePhoneContact("()-+ .")).toBeNull();
  });

  it("treats a value with no digits as unavailable", () => {
    expect(normalizePhoneContact("call me")).toBeNull();
  });

  it("never yields an empty tel: or wa.me destination for unavailable values", () => {
    for (const value of [
      undefined,
      null,
      "",
      "   ",
      "Unknown",
      " unknown ",
      "()-+ .",
      "no number here",
    ]) {
      const contact = normalizePhoneContact(value);
      expect(contact).toBeNull();
      // A null contact means the UI renders neither a tel: nor a wa.me anchor,
      // so no empty `tel:`/`https://wa.me/` link can ever be emitted.
    }
  });

  it("produces non-empty destinations for valid numbers", () => {
    const contact = normalizePhoneContact("+212661223344");
    expect(contact).not.toBeNull();
    expect(`tel:${contact!.tel}`).not.toBe("tel:");
    expect(`https://wa.me/${contact!.wa}`).not.toBe("https://wa.me/");
  });
});
