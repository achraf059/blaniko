type HomeHeroProps = {
  texts: {
    badge: string;
    title: string;
    subtitle: string;
    discoverVenues: string;
    browseCategories: string;
    popularAreas: string;
  };
};

export function HomeHero({ texts }: HomeHeroProps) {
  return (
    <section className="bl-home-hero">
      <div className="bl-home-hero-glow-top" />
      <div className="bl-home-hero-glow-bottom" />

      <div className="bl-home-hero-grid">
        <div>
          <p className="bl-home-hero-badge">{texts.badge}</p>

          <h1 className="bl-home-hero-title">{texts.title}</h1>

          <p className="bl-home-hero-subtitle">{texts.subtitle}</p>

          <div className="bl-home-hero-actions">
            <a href="#venues" className="bl-home-btn-primary">
              {texts.discoverVenues}
            </a>
            <a href="#categories" className="bl-home-btn-secondary">
              {texts.browseCategories}
            </a>
          </div>

          <p className="bl-home-hero-areas">{texts.popularAreas}</p>
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

            <div className="bl-home-hero-panel-cards">
              <div className="bl-home-hero-mini-card">
                <p className="bl-home-hero-mini-title">Curated city moments</p>
                <p className="bl-home-hero-mini-subtitle">Coffee, walks, social plans</p>
              </div>
              <div className="bl-home-hero-mini-card">
                <p className="bl-home-hero-mini-title">Lifestyle discovery</p>
                <p className="bl-home-hero-mini-subtitle">
                  Places people actually browse
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
