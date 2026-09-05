import { HomeHeader } from "../components/home/HomeHeader";
import { usePageMeta } from "../hooks/usePageMeta";
import { useI18n } from "../i18n/useI18n";
import { getFlowTexts } from "../i18n/flowTexts";
import PublicFooter from "../components/PublicFooter";
import "./PrivacyPage.css";

const CONTACT_EMAIL = "blaniko.admin@gmail.com";

export default function PrivacyPage() {
  const { dictionary, language } = useI18n();
  const p = getFlowTexts(language).privacyPage;

  usePageMeta(
    language === "fr" ? "Confidentialité | Blaniko" : "Privacy | Blaniko",
    p.metaDescription,
  );

  const emailLink = (
    <a href={`mailto:${CONTACT_EMAIL}`} className="bl-privacy-email-link">
      {CONTACT_EMAIL}
    </a>
  );

  const sections = [
    {
      id: "information-we-collect",
      title: p.collectTitle,
      body: <p>{p.collectBody}</p>,
    },
    {
      id: "how-we-use-information",
      title: p.useTitle,
      body: <p>{p.useBody}</p>,
    },
    {
      id: "browser-storage",
      title: p.storageTitle,
      body: <p>{p.storageBody}</p>,
    },
    {
      id: "service-providers",
      title: p.providersTitle,
      body: <p>{p.providersBody}</p>,
    },
    {
      id: "retention-and-deletion",
      title: p.retentionTitle,
      body: <p>{p.retentionBodyBefore}{emailLink}{p.retentionBodyAfter}</p>,
    },
    {
      id: "security",
      title: p.securityTitle,
      body: <p>{p.securityBody}</p>,
    },
    {
      id: "children",
      title: p.childrenTitle,
      body: <p>{p.childrenBody}</p>,
    },
    {
      id: "policy-changes",
      title: p.changesTitle,
      body: <p>{p.changesBody}</p>,
    },
    {
      id: "contact-us",
      title: p.contactTitle,
      body: <p>{p.contactBodyBefore}{emailLink}{p.contactBodyAfter}</p>,
    },
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
              {body}
            </div>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
