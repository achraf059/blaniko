import { Link } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import {
  type RecentActivityItem,
  type RecentActivityType,
  useRecentActivity,
} from "../hooks/useRecentActivity";
import { useI18n } from "../i18n/useI18n";
import "./HomePage.css";
import "./RecentPage.css";

const activityTypeLabel: Record<RecentActivityType, string> = {
  venue: "Venue",
  guide: "Guide",
  area: "Neighborhood",
  outing: "Outing",
};

function formatActivityDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
}

export default function RecentPage() {
  const { dictionary } = useI18n();
  const { activities, activityCount, removeActivity, clearActivities } =
    useRecentActivity();

  return (
    <div className="bl-recent-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-recent-main">
        <section className="bl-recent-hero">
          <p className="bl-recent-eyebrow">Continue exploring</p>
          <h1 className="bl-recent-title">Recently viewed</h1>
          <p className="bl-recent-subtitle">
            Return to venues, guides, neighborhoods, and outings you opened
            recently.
          </p>

          <div className="bl-recent-head-actions">
            <p>{activityCount} items</p>
            {activityCount > 0 ? (
              <button
                type="button"
                className="bl-recent-clear-btn"
                onClick={clearActivities}
              >
                Clear all
              </button>
            ) : null}
          </div>
        </section>

        {activities.length === 0 ? (
          <section className="bl-recent-empty">
            <h2>No recent activity yet.</h2>
            <p>
              Open a venue, guide, neighborhood, or outing and it will appear
              here.
            </p>
            <div className="bl-recent-empty-actions">
              <Link to="/search">Go to search</Link>
              <Link to="/guides">Browse guides</Link>
              <Link to="/plan">Plan an outing</Link>
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
                    {activityTypeLabel[item.type]}
                  </p>
                  <button
                    type="button"
                    className="bl-recent-remove-btn"
                    onClick={() => removeActivity(item)}
                  >
                    Remove
                  </button>
                </div>

                <h2 className="bl-recent-item-title">{item.title}</h2>
                <p className="bl-recent-date">
                  {formatActivityDate(item.timestamp)}
                </p>

                <Link to={item.href} className="bl-recent-open-link">
                  Open again →
                </Link>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
