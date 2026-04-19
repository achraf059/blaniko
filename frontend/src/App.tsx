import { Route, Routes } from "react-router";
import HomePage from "./pages/HomePage";
import AreaPage from "./pages/AreaPage";
import CategoryPage from "./pages/CategoryPage";
import AdminPage from "./pages/AdminPage";
import CollectionsPage from "./pages/CollectionsPage";
import ComparePage from "./pages/ComparePage";
import FavoritesPage from "./pages/FavoritesPage";
import GuideDetailPage from "./pages/GuideDetailPage";
import GuidesPage from "./pages/GuidesPage";
import MapPage from "./pages/MapPage";
import PlanPage from "./pages/PlanPage";
import RecentPage from "./pages/RecentPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import SearchPage from "./pages/SearchPage";
import VenuePage from "./pages/VenuePage";

export default function App() {
  return (
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
    </Routes>
  );
}
