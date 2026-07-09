import { HomeHeader } from "../components/home/HomeHeader";
import { usePageMeta } from "../hooks/usePageMeta";
import { useI18n } from "../i18n/useI18n";
import { getFlowTexts } from "../i18n/flowTexts";
import "./PrivacyPage.css";

const CONTACT_EMAIL = "blaniko.admin@gmail.com";

export default function PrivacyPage() {
  const { dictionary, language } = useI18n();
  const p = getFlowTexts(language).privacyPage;

  usePageMeta(
    language === "fr" ? "Confidentialité | Blaniko" : "Privacy | Blaniko",
    p.metaDescription,
  );

  const sections = [
    { id: "what-we-collect",     title: p.collectTitle,  body: <>{p.collectBody}</> },
    { id: "how-we-use-data",     title: p.useTitle,      body: <>{p.useBody}</> },
    { id: "browser-storage",     title: p.cookiesTitle,  body: <>{p.cookiesBody}</> },
    {
      id: "removing-your-data",
      title: p.removalTitle,
      body: (
        <>
          {p.removalBodyBefore}
          <a href={`mailto:${CONTACT_EMAIL}`} className="bl-privacy-email-link">
            {CONTACT_EMAIL}
          </a>
          {p.removalBodyAfter}
        </>
      ),
    },
    { id: "policy-changes",      title: p.changesTitle,  body: <>{p.changesBody}</> },
  ];

  return (
    <div className="bl-privacy-page">
      <HomeHeader labels={dictionary.header} />
      <main id="main-content" className="bl-privacy-main">
        <section className="bl-privacy-hero">
          <p className="bl-privacy-eyebrow">{p.eyebrow}</p>
          <h1 className="bl-privacy-title">{p.title}</h1>
          <p className="bl-privacy-meta">{p.lastUpdated}</p>
        </section>
        <div className="bl-privacy-body">
          {sections.map(({ id, title, body }) => (
            <div key={id} id={id} className="bl-privacy-section">
              <h2>{title}</h2>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
