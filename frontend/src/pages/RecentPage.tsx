import { Link } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import {
  type RecentActivityItem,
  useRecentActivity,
} from "../hooks/useRecentActivity";
import { usePageMeta } from "../hooks/usePageMeta";
import { useI18n } from "../i18n/useI18n";
import { getFlowTexts } from "../i18n/flowTexts";
import "./RecentPage.css";

const activityTypeLabels = {
  venue: (text: ReturnType<typeof getFlowTexts>) => text.recentPage.typeVenue,
  guide: (text: ReturnType<typeof getFlowTexts>) => text.recentPage.typeGuide,
  area: (text: ReturnType<typeof getFlowTexts>) => text.recentPage.typeArea,
  outing: (text: ReturnType<typeof getFlowTexts>) => text.recentPage.typeOuting,
};

function formatActivityDate(value: string, language: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const locale = language === "fr" ? "fr-FR" : "en-US";
  return date.toLocaleString(locale);
}

export default function RecentPage() {
  const { dictionary, language } = useI18n();
  const text = getFlowTexts(language);
  usePageMeta(
    language === "fr" ? "Activité récente | Blaniko" : "Recent Activity | Blaniko",
    language === "fr"
      ? "Vos lieux et activités récemment consultés à Casablanca."
      : "Your recently viewed venues and activities in Casablanca.",
  );
  const { activities, activityCount, removeActivity, clearActivities } =
    useRecentActivity();

  return (
    <div className="bl-recent-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-recent-main">
        <section className="bl-recent-hero">
          <p className="bl-recent-eyebrow">{text.recentPage.eyebrow}</p>
          <h1 className="bl-recent-title">{text.recentPage.title}</h1>
          <p className="bl-recent-subtitle">{text.recentPage.subtitle}</p>

          <div className="bl-recent-head-actions">
            <p>
              {text.recentPage.itemsCount.replace(
                "{count}",
                String(activityCount),
              )}
            </p>
            {activityCount > 0 ? (
              <button
                type="button"
                className="bl-recent-clear-btn"
                onClick={clearActivities}
              >
                {text.recentPage.clearAll}
              </button>
            ) : null}
          </div>
        </section>

        {activities.length === 0 ? (
          <section className="bl-recent-empty">
            <h2>{text.recentPage.emptyTitle}</h2>
            <p>{text.recentPage.emptyDescription}</p>
            <div className="bl-recent-empty-actions">
              <Link to="/search">{text.recentPage.goSearch}</Link>
              <Link to="/guides">{text.recentPage.browseGuides}</Link>
              <Link to="/plan">{text.recentPage.planOuting}</Link>
            </div>
          </section>
        ) : (
          <section className="bl-recent-list">
            {activities.map((item: RecentActivityItem) => (
              <article
                key={`${item.type}:${item.id}`}
                className="bl-recent-card"
              >
                <div className="bl-recent-card-head">
                  <p className="bl-recent-type">
                    {activityTypeLabels[item.type](text)}
                  </p>
                  <button
                    type="button"
                    className="bl-recent-remove-btn"
                    onClick={() => removeActivity(item)}
                  >
                    {text.recentPage.remove}
                  </button>
                </div>

                <h2 className="bl-recent-item-title">{item.title}</h2>
                <p className="bl-recent-date">
                  {formatActivityDate(item.timestamp, language)}
                </p>

                <Link to={item.href} className="bl-recent-open-link">
                  {text.recentPage.openAgain} →
                </Link>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
