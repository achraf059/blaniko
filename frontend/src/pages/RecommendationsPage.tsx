// /recommendations is retired. The quiz + plan flow now lives at /plan.
// This redirect keeps existing links and bookmarks working.
import { Navigate } from "react-router";

export default function RecommendationsPage() {
  return <Navigate to="/plan" replace />;
}
