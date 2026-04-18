import { Route, Routes } from "react-router";
import HomePage from "./pages/HomePage";
import CategoryPage from "./pages/CategoryPage";
import AdminPage from "./pages/AdminPage";
import FavoritesPage from "./pages/FavoritesPage";
import MapPage from "./pages/MapPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import SearchPage from "./pages/SearchPage";
import VenuePage from "./pages/VenuePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/favorites" element={<FavoritesPage />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/recommendations" element={<RecommendationsPage />} />
      <Route path="/categories/:slug" element={<CategoryPage />} />
      <Route path="/venues/:slug" element={<VenuePage />} />
    </Routes>
  );
}
