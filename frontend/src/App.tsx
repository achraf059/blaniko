import { lazy, Suspense, type ReactNode } from "react";
import { Route, Routes } from "react-router";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Eager: core discovery paths hit on every session — no benefit to deferring
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import CategoryPage from "./pages/CategoryPage";
import FavoritesPage from "./pages/FavoritesPage";
import RecentPage from "./pages/RecentPage";
import PrivacyPage from "./pages/PrivacyPage";
import NotFoundPage from "./pages/NotFoundPage";

// Lazy: heavy / non-critical routes — deferred until first navigation
const PlanPage = lazy(() => import("./pages/PlanPage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const RecommendationsPage = lazy(() => import("./pages/RecommendationsPage"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const VenuePage = lazy(() => import("./pages/VenuePage"));
const GuidesPage = lazy(() => import("./pages/GuidesPage"));
const GuideDetailPage = lazy(() => import("./pages/GuideDetailPage"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const PartnersPage = lazy(() => import("./pages/PartnersPage"));
const AreaPage = lazy(() => import("./pages/AreaPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));

function RouteLoadingFallback() {
  return (
    <div className="bl-route-loading" role="status" aria-label="Loading" />
  );
}

// Wraps a route element in its own ErrorBoundary so a crash in one route
// does not propagate to the global boundary or affect other routes.
function withRouteBoundary(element: ReactNode) {
  return <ErrorBoundary>{element}</ErrorBoundary>;
}

export default function App() {
  return (
    // Top-level boundary: last-resort catch for anything outside the Routes
    // (e.g. a crash in the router itself or a future layout wrapper).
    <ErrorBoundary>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={withRouteBoundary(<HomePage />)} />
          <Route path="/admin" element={withRouteBoundary(<AdminPage />)} />
          <Route path="/collections" element={withRouteBoundary(<CollectionsPage />)} />
          <Route path="/compare" element={withRouteBoundary(<ComparePage />)} />
          <Route path="/favorites" element={withRouteBoundary(<FavoritesPage />)} />
          <Route path="/guides" element={withRouteBoundary(<GuidesPage />)} />
          <Route path="/guides/:slug" element={withRouteBoundary(<GuideDetailPage />)} />
          <Route path="/map" element={withRouteBoundary(<MapPage />)} />
          <Route path="/plan" element={withRouteBoundary(<PlanPage />)} />
          <Route path="/search" element={withRouteBoundary(<SearchPage />)} />
          <Route path="/recommendations" element={withRouteBoundary(<RecommendationsPage />)} />
          <Route path="/recent" element={withRouteBoundary(<RecentPage />)} />
          <Route path="/areas/:slug" element={withRouteBoundary(<AreaPage />)} />
          <Route path="/categories/:slug" element={withRouteBoundary(<CategoryPage />)} />
          <Route path="/venues/:slug" element={withRouteBoundary(<VenuePage />)} />
          <Route path="/privacy" element={withRouteBoundary(<PrivacyPage />)} />
          <Route path="/partners" element={withRouteBoundary(<PartnersPage />)} />
          <Route path="/login" element={withRouteBoundary(<LoginPage />)} />
          <Route path="/account" element={withRouteBoundary(<AccountPage />)} />
          <Route path="*" element={withRouteBoundary(<NotFoundPage />)} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
