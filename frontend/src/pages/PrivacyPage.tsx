import { HomeHeader } from "../components/home/HomeHeader";
import { usePageMeta } from "../hooks/usePageMeta";
import { useI18n } from "../i18n/useI18n";
import { getFlowTexts } from "../i18n/flowTexts";
import "./PrivacyPage.css";

export default function PrivacyPage() {
  const { dictionary, language } = useI18n();
  const p = getFlowTexts(language).privacyPage;

  usePageMeta(
    language === "fr" ? "Confidentialité | Blaniko" : "Privacy | Blaniko",
  );

  const sections = [
    { title: p.collectTitle, body: p.collectBody },
    { title: p.useTitle, body: p.useBody },
    { title: p.cookiesTitle, body: p.cookiesBody },
    { title: p.removalTitle, body: p.removalBody },
    { title: p.changesTitle, body: p.changesBody },
  ];

  return (
    <div className="bl-privacy-page">
      <HomeHeader labels={dictionary.header} />
      <main className="bl-privacy-main">
        <section className="bl-privacy-hero">
          <p className="bl-privacy-eyebrow">{p.eyebrow}</p>
          <h1 className="bl-privacy-title">{p.title}</h1>
          <p className="bl-privacy-meta">{p.lastUpdated}</p>
        </section>
        <div className="bl-privacy-body">
          {sections.map(({ title, body }) => (
            <div key={title} className="bl-privacy-section">
              <h2>{title}</h2>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
