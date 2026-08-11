import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes, useSearchParams } from "react-router";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Eager: core discovery paths hit on every session — no benefit to deferring
import HomePage from "./pages/HomePage";
import CategoryPage from "./pages/CategoryPage";
import FavoritesPage from "./pages/FavoritesPage";
import RecentPage from "./pages/RecentPage";
import NotFoundPage from "./pages/NotFoundPage";

// Lazy: heavy / non-critical routes — deferred until first navigation
const PlanPage = lazy(() => import("./pages/PlanPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
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

/** Redirects /search to /categories, preserving compatible query parameters. */
function SearchRedirect() {
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category");
  if (category) {
    // Category-specific search → go straight to that category page
    return <Navigate to={`/categories/${category}`} replace />;
  }
  const params = new URLSearchParams();
  const q = searchParams.get("q");
  const bestFor = searchParams.get("bestFor");
  const time = searchParams.get("time");
  if (q) params.set("q", q);
  // V3 area safety: area is not propagated into the /categories redirect while
  // neighborhood filtering has no effect (all venues resolve to "Casablanca").
  if (bestFor) params.set("bestFor", bestFor);
  if (time) params.set("time", time);
  const suffix = params.toString();
  return <Navigate to={suffix ? `/categories?${suffix}` : "/categories"} replace />;
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
          <Route path="/search" element={withRouteBoundary(<SearchRedirect />)} />
          <Route path="/recommendations" element={withRouteBoundary(<RecommendationsPage />)} />
          <Route path="/recent" element={withRouteBoundary(<RecentPage />)} />
          <Route path="/areas/:slug" element={withRouteBoundary(<AreaPage />)} />
          <Route path="/categories" element={withRouteBoundary(<CategoryPage />)} />
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
