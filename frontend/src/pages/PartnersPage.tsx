import { useState } from "react";
import { useSearchParams } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { usePageMeta } from "../hooks/usePageMeta";
import { useI18n } from "../i18n/useI18n";
import { getFlowTexts } from "../i18n/flowTexts";
import "./PartnersPage.css";

type ClaimType = "claim" | "listing";
type FormStatus =
  | "idle"
  | "submitting"
  | "success"
  | "error"
  | "invalid_email"
  | "missing_fields";

export default function PartnersPage() {
  const { dictionary, language } = useI18n();
  const p = getFlowTexts(language).partnersPage;
  const [searchParams] = useSearchParams();

  usePageMeta(
    language === "fr"
      ? "Pour les établissements | Blaniko"
      : "For venues | Blaniko",
  );

  const prefillSlug = searchParams.get("venue") ?? "";
  const prefillName = searchParams.get("name") ?? "";

  const [type, setType] = useState<ClaimType>(prefillSlug ? "claim" : "listing");
  const [venueName, setVenueName] = useState(prefillName);
  const [venueNameLocked, setVenueNameLocked] = useState(Boolean(prefillSlug));
  const [contactName, setContactName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");

  const handleTypeChange = (next: ClaimType) => {
    setType(next);
    if (next === "listing") {
      setVenueNameLocked(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contactName.trim() || !email.trim() || !message.trim()) {
      setStatus("missing_fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setStatus("invalid_email");
      return;
    }

    setStatus("submitting");

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiUrl}/api/venue-claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          venue_slug: prefillSlug || null,
          venue_name: venueName.trim() || null,
          contact_name: contactName.trim(),
          contact_email: email.trim(),
          contact_whatsapp: whatsapp.trim() || null,
          role_at_venue: role.trim() || null,
          message: message.trim(),
          official_website: website.trim() || null,
          instagram: instagram.trim() || null,
          language,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (data.success) {
        setStatus("success");
      } else if (data.error === "invalid_email") {
        setStatus("invalid_email");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const inlineError =
    status === "invalid_email"
      ? p.errorEmail
      : status === "missing_fields"
        ? p.errorRequired
        : status === "error"
          ? p.errorGeneral
          : null;

  return (
    <div className="bl-partners-page">
      <HomeHeader labels={dictionary.header} />
      <main className="bl-partners-main">
        <section className="bl-partners-hero">
          <p className="bl-partners-eyebrow">{p.eyebrow}</p>
          <h1 className="bl-partners-title">{p.title}</h1>
          <p className="bl-partners-subtitle">{p.subtitle}</p>
        </section>

        <div className="bl-partners-body">
          {status === "success" ? (
            <div className="bl-partners-success">
              <div className="bl-partners-success-icon">✓</div>
              <h2 className="bl-partners-success-title">{p.successTitle}</h2>
              <p className="bl-partners-success-body">{p.successBody}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="bl-partners-form">
              {/* Type toggle */}
              <div className="bl-partners-toggle" role="group">
                <label className={`bl-partners-toggle-option ${type === "claim" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="claim-type"
                    value="claim"
                    checked={type === "claim"}
                    onChange={() => handleTypeChange("claim")}
                  />
                  {p.typeClaimLabel}
                </label>
                <label className={`bl-partners-toggle-option ${type === "listing" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="claim-type"
                    value="listing"
                    checked={type === "listing"}
                    onChange={() => handleTypeChange("listing")}
                  />
                  {p.typeListingLabel}
                </label>
              </div>

              {/* Venue name */}
              <div className="bl-partners-field">
                <label className="bl-partners-label">
                  {p.fieldVenueName} <span className="bl-partners-required">*</span>
                </label>
                {venueNameLocked ? (
                  <div className="bl-partners-venue-locked">
                    <span className="bl-partners-venue-locked-name">{venueName}</span>
                    <button
                      type="button"
                      className="bl-partners-wrong-venue"
                      onClick={() => {
                        setVenueNameLocked(false);
                        setVenueName("");
                      }}
                    >
                      {p.wrongVenue}
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    className="bl-partners-input"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    disabled={status === "submitting"}
                  />
                )}
              </div>

              {/* Contact name */}
              <div className="bl-partners-field">
                <label className="bl-partners-label">
                  {p.fieldContactName} <span className="bl-partners-required">*</span>
                </label>
                <input
                  type="text"
                  className="bl-partners-input"
                  value={contactName}
                  onChange={(e) => {
                    setContactName(e.target.value);
                    setStatus("idle");
                  }}
                  disabled={status === "submitting"}
                />
              </div>

              {/* Role */}
              <div className="bl-partners-field">
                <label className="bl-partners-label">{p.fieldRole}</label>
                <input
                  type="text"
                  className="bl-partners-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={status === "submitting"}
                />
              </div>

              {/* Email */}
              <div className="bl-partners-field">
                <label className="bl-partners-label">
                  {p.fieldEmail} <span className="bl-partners-required">*</span>
                </label>
                <input
                  type="email"
                  className="bl-partners-input"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setStatus("idle");
                  }}
                  disabled={status === "submitting"}
                />
              </div>

              {/* WhatsApp */}
              <div className="bl-partners-field">
                <label className="bl-partners-label">{p.fieldWhatsApp}</label>
                <input
                  type="tel"
                  className="bl-partners-input"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  disabled={status === "submitting"}
                />
              </div>

              {/* Website */}
              <div className="bl-partners-field">
                <label className="bl-partners-label">{p.fieldWebsite}</label>
                <input
                  type="url"
                  className="bl-partners-input"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  disabled={status === "submitting"}
                />
              </div>

              {/* Instagram */}
              <div className="bl-partners-field">
                <label className="bl-partners-label">{p.fieldInstagram}</label>
                <input
                  type="text"
                  className="bl-partners-input"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  disabled={status === "submitting"}
                />
              </div>

              {/* Message */}
              <div className="bl-partners-field">
                <label className="bl-partners-label">
                  {p.fieldMessage} <span className="bl-partners-required">*</span>
                </label>
                <textarea
                  className="bl-partners-textarea"
                  rows={5}
                  placeholder={p.fieldMessagePlaceholder}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setStatus("idle");
                  }}
                  disabled={status === "submitting"}
                />
              </div>

              {inlineError ? (
                <div className="bl-partners-error" role="alert">
                  {inlineError}
                </div>
              ) : null}

              <button
                type="submit"
                className="bl-partners-submit"
                disabled={status === "submitting"}
              >
                {status === "submitting" ? p.submitting : p.submitBtn}
              </button>

              <p className="bl-partners-disclaimer">{p.disclaimer}</p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
