import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { useI18n } from "../i18n/useI18n";
import { usePageMeta } from "../hooks/usePageMeta";
import { useAuth } from "../auth/useAuth";
import "./LoginPage.css";

export default function LoginPage() {
  const { dictionary, language } = useI18n();
  const t = dictionary.loginPage;
  const { signInWithEmail, isConfigured } = useAuth();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  usePageMeta(
    language === "fr" ? "Connexion | Blaniko" : "Sign in | Blaniko",
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLocalError(null);
    setSubmitting(true);
    const err = await signInWithEmail(email.trim());
    setSubmitting(false);
    if (err) {
      setLocalError(err);
    } else {
      setSent(true);
    }
  }

  // Show the not-configured notice immediately if the Supabase client is absent —
  // no need to wait for a form submission to discover this.
  const notConfigured = !isConfigured;

  return (
    <div className="bl-login-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-login-main">
        <section className="bl-login-card">
          {sent ? (
            <>
              <p className="bl-login-eyebrow">✓</p>
              <h1 className="bl-login-title">{t.successTitle}</h1>
              <p className="bl-login-desc">{t.successDesc}</p>
              <Link to="/" className="bl-login-btn-secondary">{t.backToHome}</Link>
            </>
          ) : notConfigured ? (
            <>
              <h1 className="bl-login-title">{t.title}</h1>
              <p className="bl-login-desc">{t.notConfigured}</p>
              <Link to="/" className="bl-login-btn-secondary">{t.backToHome}</Link>
            </>
          ) : (
            <>
              <h1 className="bl-login-title">{t.title}</h1>
              <p className="bl-login-desc">{t.subtitle}</p>

              <form className="bl-login-form" onSubmit={handleSubmit} noValidate>
                <label className="bl-login-label" htmlFor="bl-login-email">
                  {t.emailLabel}
                </label>
                <input
                  id="bl-login-email"
                  className="bl-login-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  required
                  disabled={submitting}
                />

                {localError && localError !== "Auth is not configured." && (
                  <p className="bl-login-error" role="alert">{localError}</p>
                )}

                <button
                  type="submit"
                  className="bl-login-btn-primary"
                  disabled={submitting || !email.trim()}
                >
                  {submitting ? t.submitting : t.submitBtn}
                </button>
              </form>

              <Link to="/" className="bl-login-back">{t.backToHome}</Link>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
