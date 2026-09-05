import "./HomePage.css";
import HomeLanding from "../home-landing/App.jsx";
import { usePageMeta } from "../hooks/usePageMeta";
import { useI18n } from "../i18n/useI18n";

export default function HomePage() {
  const { language } = useI18n();
  usePageMeta(
    language === "fr" ? "Blaniko — Sortez à Casablanca" : "Blaniko — Go Out in Casablanca",
    language === "fr"
      ? "Découvrez les meilleures activités, sports, gaming et sorties à Casablanca."
      : "Discover the best activities, sports, gaming and outings in Casablanca.",
  );
  return <HomeLanding />;
}
