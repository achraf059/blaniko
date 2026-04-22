import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BudgetSelector } from "../discovery/BudgetSelector";
import { FilterChips } from "../discovery/FilterChips";
import { SearchBar } from "../discovery/SearchBar";

type HomeHeroProps = {
  texts: {
    badge: string;
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    searchAction: string;
    quickFiltersLabel: string;
    budgetLabel: string;
    budgetAll: string;
    budgetLow: string;
    budgetMid: string;
    budgetHigh: string;
    recommendationsCta: string;
    helperText: string;
    panelEyebrow: string;
    panelStatOneLabel: string;
    panelStatOneValue: string;
    panelStatTwoLabel: string;
    panelStatTwoValue: string;
    panelStatThreeLabel: string;
    panelStatThreeValue: string;
  };
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onSearchSubmit: () => void;
  quickFilters: Array<{ value: string; label: string }>;
  selectedFilter?: string;
  onFilterSelect: (value: string) => void;
  budgetValue: string;
  onBudgetChange: (value: string) => void;
  onRecommendationsClick: () => void;
};

type HeroActivityCard = {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  vibe: string;
  emoji: string;
  gradient: string;
};

const heroActivityCards: HeroActivityCard[] = [
  {
    id: "padel",
    title: "Padel Sessions",
    subtitle: "Prime evening courts",
    tag: "Sport",
    vibe: "4.8 energy",
    emoji: "🎾",
    gradient: "linear-gradient(135deg, #d8d2ff 0%, #b8a8e8 52%, #8f7ed9 100%)",
  },
  {
    id: "karting",
    title: "Karting Rush",
    subtitle: "Fast laps with friends",
    tag: "Adrenaline",
    vibe: "Night picks",
    emoji: "🏁",
    gradient: "linear-gradient(135deg, #c6dcff 0%, #aeb8ff 50%, #9f8de8 100%)",
  },
  {
    id: "gaming",
    title: "Gaming Arena",
    subtitle: "Console battles + co-op",
    tag: "Indoor",
    vibe: "Team mode",
    emoji: "🎮",
    gradient: "linear-gradient(135deg, #d4cdff 0%, #bbb0f7 48%, #9486de 100%)",
  },
  {
    id: "bowling",
    title: "Bowling Night",
    subtitle: "Late sessions in Maarif",
    tag: "Social",
    vibe: "Group favorite",
    emoji: "🎳",
    gradient: "linear-gradient(135deg, #cfe8ff 0%, #c4d0ff 48%, #a292e8 100%)",
  },
  {
    id: "surf",
    title: "Surf & Beach",
    subtitle: "Ain Diab sunset flow",
    tag: "Outdoor",
    vibe: "Golden hour",
    emoji: "🌊",
    gradient: "linear-gradient(135deg, #cdeaff 0%, #c9dcff 50%, #a79ae9 100%)",
  },
  {
    id: "escape",
    title: "Escape Rooms",
    subtitle: "Puzzle nights in center",
    tag: "Challenge",
    vibe: "90-min missions",
    emoji: "🧩",
    gradient: "linear-gradient(135deg, #e0d7ff 0%, #cbc2ff 45%, #9d8ce6 100%)",
  },
  {
    id: "rooftop",
    title: "Rooftop Social",
    subtitle: "Skyline sets + sunset crowd",
    tag: "Social",
    vibe: "Afterwork",
    emoji: "🌆",
    gradient: "linear-gradient(135deg, #d3e6ff 0%, #c0ceff 50%, #9485de 100%)",
  },
];

export function HomeHero({
  texts,
  searchValue,
  onSearchValueChange,
  onSearchSubmit,
  quickFilters,
  selectedFilter,
  onFilterSelect,
  budgetValue,
  onBudgetChange,
  onRecommendationsClick,
}: HomeHeroProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const floatingHeroCardIds = new Set([
    "padel",
    "karting",
    "gaming",
    "bowling",
    "rooftop",
  ]);
  const floatingHeroCards = heroActivityCards.filter((card) =>
    floatingHeroCardIds.has(card.id),
  );
  const landingSlots = ["padel", "karting", "gaming", "bowling", "rooftop"];

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReduceMotion(mediaQuery.matches);
    };

    sync();
    mediaQuery.addEventListener("change", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || reduceMotion) {
      return;
    }

    let animationFrame = 0;

    const update = () => {
      const hero = heroRef.current;
      if (!hero) {
        return;
      }

      const rect = hero.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const progressStart = viewportHeight * 0.92;
      const progressEnd = -rect.height * 0.3;
      const raw = (progressStart - rect.top) / (progressStart - progressEnd);
      const clamped = Math.max(0, Math.min(1, raw));

      setScrollProgress((previous) =>
        Math.abs(previous - clamped) > 0.003 ? clamped : previous,
      );
      animationFrame = 0;
    };

    const queueUpdate = () => {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(update);
    };

    queueUpdate();
    window.addEventListener("scroll", queueUpdate, { passive: true });
    window.addEventListener("resize", queueUpdate);

    return () => {
      window.removeEventListener("scroll", queueUpdate);
      window.removeEventListener("resize", queueUpdate);
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [reduceMotion]);

  const budgetOptions = [
    { value: "all", label: texts.budgetAll },
    { value: "$", label: texts.budgetLow },
    { value: "$$", label: texts.budgetMid },
    { value: "$$$", label: texts.budgetHigh },
  ];

  const heroStyle = {
    "--hero-scroll-progress": String(reduceMotion ? 0 : scrollProgress),
  } as CSSProperties;

  return (
    <>
      <section
        ref={heroRef}
        className="bl-home-hero bl-home-hero-upgraded"
        style={heroStyle}
      >
        <div className="bl-home-hero-glow-top" />
        <div className="bl-home-hero-glow-bottom" />
        <div className="bl-home-hero-glow-mid" />

        <div className="bl-home-hero-grid">
          <div className="bl-home-hero-content">
            <p className="bl-home-hero-badge">{texts.badge}</p>

            <h1 className="bl-home-hero-title">{texts.title}</h1>

            <p className="bl-home-hero-subtitle">{texts.subtitle}</p>

            <div className="bl-discovery-stack">
              <SearchBar
                value={searchValue}
                onChange={onSearchValueChange}
                onSubmit={onSearchSubmit}
                placeholder={texts.searchPlaceholder}
                submitLabel={texts.searchAction}
              />

              <div>
                <p className="bl-discovery-label">{texts.quickFiltersLabel}</p>
                <FilterChips
                  options={quickFilters}
                  selectedValue={selectedFilter}
                  onSelect={onFilterSelect}
                />
              </div>

              <div className="bl-discovery-bottom-row">
                <div>
                  <p className="bl-discovery-label">{texts.budgetLabel}</p>
                  <BudgetSelector
                    options={budgetOptions}
                    selectedValue={budgetValue}
                    onSelect={onBudgetChange}
                  />
                </div>

                <button
                  type="button"
                  className="bl-home-btn-primary bl-discovery-reco-btn"
                  onClick={onRecommendationsClick}
                >
                  {texts.recommendationsCta}
                </button>
              </div>
            </div>

            <p className="bl-home-hero-areas">{texts.helperText}</p>
          </div>

          <div className="bl-home-hero-activity-stage" aria-hidden="true">
            <div className="bl-home-hero-stage-grid" />

            {floatingHeroCards.map((card) => (
              <article
                key={card.id}
                className={`bl-home-activity-card bl-home-activity-card-${card.id}`}
              >
                <div
                  className="bl-home-activity-card-cover"
                  style={{ background: card.gradient }}
                >
                  <span>{card.emoji}</span>
                  <p>{card.tag}</p>
                </div>

                <div className="bl-home-activity-card-body">
                  <p className="bl-home-activity-card-title">{card.title}</p>
                  <p className="bl-home-activity-card-subtitle">
                    {card.subtitle}
                  </p>
                  <p className="bl-home-activity-card-vibe">{card.vibe}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="bl-home-story-block"
        aria-labelledby="home-story-landing-title"
      >
        <div className="bl-home-story-landing">
          <div className="bl-home-story-copy">
            <p className="bl-home-story-eyebrow">Discovery flow</p>
            <h2 id="home-story-landing-title" className="bl-home-story-title">
              Your picks, continued
            </h2>
            <p className="bl-home-story-subtitle">
              The experiences from above settle here as you scroll.
            </p>
          </div>

          <div
            className="bl-home-story-stage"
            aria-label="Landing slots for incoming hero visuals"
          >
            {landingSlots.map((slot) => (
              <article
                key={`landing-slot-${slot}`}
                className={`bl-home-story-slot bl-home-story-slot--${slot}`}
                aria-label={`Landing slot for ${slot}`}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
