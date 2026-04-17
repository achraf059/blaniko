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
  const budgetOptions = [
    { value: "all", label: texts.budgetAll },
    { value: "$", label: texts.budgetLow },
    { value: "$$", label: texts.budgetMid },
    { value: "$$$", label: texts.budgetHigh },
  ];

  return (
    <section className="bl-home-hero bl-home-hero-upgraded">
      <div className="bl-home-hero-glow-top" />
      <div className="bl-home-hero-glow-bottom" />

      <div className="bl-home-hero-grid">
        <div>
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

        <div className="bl-home-hero-panel-wrap">
          <div className="bl-home-hero-panel">
            <div className="bl-home-hero-panel-image">
              <div className="bl-home-hero-city-tag">Casablanca</div>
              <div className="bl-home-hero-area-tags">
                <span>Maarif</span>
                <span>Ain Diab</span>
                <span>Old Medina</span>
              </div>
            </div>

            <p className="bl-home-hero-panel-eyebrow">{texts.panelEyebrow}</p>

            <div className="bl-home-hero-panel-cards">
              <div className="bl-home-hero-mini-card">
                <p className="bl-home-hero-mini-title">{texts.panelStatOneLabel}</p>
                <p className="bl-home-hero-mini-subtitle">{texts.panelStatOneValue}</p>
              </div>
              <div className="bl-home-hero-mini-card">
                <p className="bl-home-hero-mini-title">{texts.panelStatTwoLabel}</p>
                <p className="bl-home-hero-mini-subtitle">{texts.panelStatTwoValue}</p>
              </div>
              <div className="bl-home-hero-mini-card">
                <p className="bl-home-hero-mini-title">{texts.panelStatThreeLabel}</p>
                <p className="bl-home-hero-mini-subtitle">{texts.panelStatThreeValue}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
