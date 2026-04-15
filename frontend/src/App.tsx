import { Route, Routes } from "react-router";
import HomePage from "./pages/HomePage";
import CategoryPage from "./pages/CategoryPage";
import VenuePage from "./pages/VenuePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/categories/:slug" element={<CategoryPage />} />
      <Route path="/venues/:slug" element={<VenuePage />} />
    </Routes>
  );
}
