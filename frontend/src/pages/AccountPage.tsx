import { useState } from "react";
import { Link } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { useI18n } from "../i18n/useI18n";
import { usePageMeta } from "../hooks/usePageMeta";
import { useAuth } from "../auth/useAuth";
import { useProfile } from "../auth/useProfile";
import "./AccountPage.css";

function formatDate(iso: string, language: string): string {
  try {
    return new Date(iso).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function AccountPage() {
  const { dictionary, language } = useI18n();
  const t = dictionary.accountPage;
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile(user);

  const [signingOut, setSigningOut] = useState(false);

  usePageMeta(
    language === "fr" ? "Mon compte | Blaniko" : "My account | Blaniko",
  );

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  }

  const isLoading = authLoading || (user !== null && profileLoading);

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
              <dl className="bl-account-profile-list">
                <div className="bl-account-profile-row">
                  <dt>{t.loggedInAs}</dt>
                  <dd className="bl-account-email">{user.email}</dd>
                </div>
                {profile && (
                  <>
                    <div className="bl-account-profile-row">
                      <dt>{language === "fr" ? "Langue" : "Language"}</dt>
                      <dd>{profile.language === "fr" ? "Français" : "English"}</dd>
                    </div>
                    <div className="bl-account-profile-row">
                      <dt>{language === "fr" ? "Thème" : "Theme"}</dt>
                      <dd>{profile.theme === "dark"
                        ? (language === "fr" ? "Sombre" : "Dark")
                        : (language === "fr" ? "Clair" : "Light")}
                      </dd>
                    </div>
                    <div className="bl-account-profile-row">
                      <dt>{language === "fr" ? "Membre depuis" : "Member since"}</dt>
                      <dd>{formatDate(profile.created_at, language)}</dd>
                    </div>
                  </>
                )}
              </dl>

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
