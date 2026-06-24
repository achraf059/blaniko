import { useState } from "react";
import { Link } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { useI18n } from "../i18n/useI18n";
import { usePageMeta } from "../hooks/usePageMeta";
import { useAuth } from "../auth/useAuth";
import "./AccountPage.css";

export default function AccountPage() {
  const { dictionary, language } = useI18n();
  const t = dictionary.accountPage;
  const { user, isLoading, signOut } = useAuth();

  const [signingOut, setSigningOut] = useState(false);

  usePageMeta(
    language === "fr" ? "Mon compte | Blaniko" : "My account | Blaniko",
  );

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  }

  return (
    <div className="bl-account-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-account-main">
        <section className="bl-account-card">
          <h1 className="bl-account-title">{t.title}</h1>

          {isLoading ? (
            <div className="bl-account-loading" role="status" aria-label="Loading" />
          ) : user ? (
            <>
              <p className="bl-account-email-label">{t.loggedInAs}</p>
              <p className="bl-account-email">{user.email}</p>
              <button
                type="button"
                className="bl-account-btn-signout"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? t.logOutting : t.logOutBtn}
              </button>
            </>
          ) : (
            <>
              <p className="bl-account-guest-title">{t.guestTitle}</p>
              <p className="bl-account-guest-desc">{t.guestDesc}</p>
              <Link to="/login" className="bl-account-btn-login">{t.loginBtn}</Link>
            </>
          )}

          <Link to="/" className="bl-account-back">{t.backToHome}</Link>
        </section>
      </main>
    </div>
  );
}
