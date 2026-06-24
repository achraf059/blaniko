import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Eager: core discovery paths hit on every session — no benefit to deferring
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import CategoryPage from "./pages/CategoryPage";
import VenuePage from "./pages/VenuePage";
import GuidesPage from "./pages/GuidesPage";
import GuideDetailPage from "./pages/GuideDetailPage";
import AreaPage from "./pages/AreaPage";
import CollectionsPage from "./pages/CollectionsPage";
import FavoritesPage from "./pages/FavoritesPage";
import RecentPage from "./pages/RecentPage";
import PrivacyPage from "./pages/PrivacyPage";
import PartnersPage from "./pages/PartnersPage";
import NotFoundPage from "./pages/NotFoundPage";
import LoginPage from "./pages/LoginPage";
import AccountPage from "./pages/AccountPage";

// Lazy: heavy / non-critical routes — deferred until first navigation
const PlanPage = lazy(() => import("./pages/PlanPage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const RecommendationsPage = lazy(() => import("./pages/RecommendationsPage"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));

function RouteLoadingFallback() {
  return (
    <div className="bl-route-loading" role="status" aria-label="Loading" />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/guides" element={<GuidesPage />} />
          <Route path="/guides/:slug" element={<GuideDetailPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/recent" element={<RecentPage />} />
          <Route path="/areas/:slug" element={<AreaPage />} />
          <Route path="/categories/:slug" element={<CategoryPage />} />
          <Route path="/venues/:slug" element={<VenuePage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
