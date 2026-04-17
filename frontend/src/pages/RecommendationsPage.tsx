import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueCard } from "../components/home/VenueCard";
import { ProgressBar } from "../components/recommendations/ProgressBar";
import { QuizStep } from "../components/recommendations/QuizStep";
import { ResultsHeader } from "../components/recommendations/ResultsHeader";
import { categories, venues } from "../data/mockData";
import { useI18n } from "../i18n/useI18n";
import "./HomePage.css";
import "./RecommendationsPage.css";

type QuizAnswers = {
  companion: string;
  category: string;
  budget: string;
  area: string;
  vibe: string;
};

type QuizQuestion = {
  id: keyof QuizAnswers;
  title: string;
  options: Array<{ value: string; label: string }>;
  description?: string;
};

export default function RecommendationsPage() {
  const { dictionary } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const categoryFromUrl = searchParams.get("category");
  const budgetFromUrl = searchParams.get("budget");

  const validCategory = categories.some((category) => category.slug === categoryFromUrl)
    ? (categoryFromUrl ?? "")
    : "";

  const validBudget = ["all", "$", "$$", "$$$"].includes(budgetFromUrl ?? "")
    ? (budgetFromUrl as string)
    : "all";

  const [stepIndex, setStepIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [answers, setAnswers] = useState<QuizAnswers>({
    companion: "",
    category: validCategory,
    budget: validBudget,
    area: "",
    vibe: "",
  });

  const questions: QuizQuestion[] = [
    {
      id: "companion",
      title: "Who are you with?",
      options: [
        { value: "alone", label: "Alone" },
        { value: "friends", label: "Friends" },
        { value: "family", label: "Family" },
        { value: "partner", label: "Partner" },
      ],
    },
    {
      id: "category",
      title: "What are you looking for?",
      options: [
        { value: "cafes", label: "Cafes" },
        { value: "restaurants", label: "Restaurants" },
        { value: "activities", label: "Activities" },
        { value: "sports", label: "Sports" },
        { value: "gaming", label: "Gaming" },
        { value: "outdoor", label: "Outdoor" },
      ],
    },
    {
      id: "budget",
      title: "What is your budget?",
      options: [
        { value: "all", label: "All" },
        { value: "$", label: "$" },
        { value: "$$", label: "$$" },
        { value: "$$$", label: "$$$" },
      ],
    },
    {
      id: "area",
      title: "Preferred area?",
      options: [
        { value: "any", label: "Any" },
        { value: "maarif", label: "Maarif" },
        { value: "ain diab", label: "Ain Diab" },
        { value: "gauthier", label: "Gauthier" },
        { value: "old medina", label: "Old Medina" },
      ],
    },
    {
      id: "vibe",
      title: "What vibe do you want?",
      options: [
        { value: "chill", label: "Chill" },
        { value: "social", label: "Social" },
        { value: "active", label: "Active" },
        { value: "romantic", label: "Romantic" },
        { value: "family-friendly", label: "Family-friendly" },
      ],
    },
  ];

  const currentQuestion = questions[stepIndex];
  const currentValue = answers[currentQuestion.id];

  const getLabel = (id: keyof QuizAnswers, value: string) =>
    questions
      .find((question) => question.id === id)
      ?.options.find((option) => option.value === value)?.label;

  const scoredResults = useMemo(() => {
    const companionKeywords: Record<string, string[]> = {
      alone: ["solo", "freelancer", "remote", "professional", "general"],
      friends: ["friends", "groups", "students", "young professionals", "gamers"],
      family: ["family", "parents", "children", "kid"],
      partner: ["couples", "romantic", "intimate", "date"],
    };

    const vibeKeywords: Record<string, string[]> = {
      chill: ["calm", "quiet", "chill", "relaxed", "cozy"],
      social: ["social", "lively", "community", "friendly"],
      active: ["active", "fitness", "sports", "motivating"],
      romantic: ["romantic", "intimate", "date"],
      "family-friendly": ["family", "safe", "welcoming", "children"],
    };

    return venues
      .map((venue) => {
        let score = 0;

        if (answers.category && venue.categorySlug === answers.category) {
          score += 4;
        }

        if (answers.budget === "all") {
          score += 1;
        } else if (venue.priceLevel === answers.budget) {
          score += 3;
        }

        if (answers.area && answers.area !== "any") {
          const haystack = venue.area.toLowerCase();
          if (haystack.includes(answers.area)) {
            score += 3;
          }
        }

        const audienceText = (venue.audience ?? "").toLowerCase();
        if (answers.companion) {
          const match = companionKeywords[answers.companion]?.some((keyword) =>
            audienceText.includes(keyword)
          );
          if (match) {
            score += 2;
          }
        }

        const vibeText = `${venue.vibe ?? ""} ${venue.description}`.toLowerCase();
        if (answers.vibe) {
          const match = vibeKeywords[answers.vibe]?.some((keyword) =>
            vibeText.includes(keyword)
          );
          if (match) {
            score += 2;
          }
        }

        return { venue, score };
      })
      .sort((first, second) => second.score - first.score);
  }, [answers]);

  const topMatches = scoredResults.slice(0, 3);
  const alternatives = scoredResults.slice(3, 8);

  const summary = [
    getLabel("companion", answers.companion),
    getLabel("category", answers.category),
    getLabel("budget", answers.budget),
    getLabel("area", answers.area),
    getLabel("vibe", answers.vibe),
  ]
    .filter(Boolean)
    .join(" + ");

  const applyAnswer = (value: string) => {
    setAnswers((previous) => ({ ...previous, [currentQuestion.id]: value }));
  };

  const nextStep = () => {
    if (!currentValue) {
      return;
    }

    if (stepIndex === questions.length - 1) {
      setIsComplete(true);
      return;
    }

    setStepIndex((previous) => previous + 1);
  };

  const previousStep = () => {
    if (stepIndex === 0) {
      return;
    }
    setStepIndex((previous) => previous - 1);
  };

  const retakeQuiz = () => {
    setAnswers({
      companion: "",
      category: validCategory,
      budget: validBudget,
      area: "",
      vibe: "",
    });
    setStepIndex(0);
    setIsComplete(false);
  };

  const browseAllResults = () => {
    const params = new URLSearchParams();

    if (answers.category) {
      params.set("category", answers.category);
    }

    if (answers.budget && answers.budget !== "all") {
      params.set("budget", answers.budget);
    }

    const suffix = params.toString();
    navigate(suffix ? `/search?${suffix}` : "/search");
  };

  return (
    <div className="bl-reco-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-reco-main">
        {!isComplete ? (
          <section className="bl-reco-card">
            <p className="bl-reco-eyebrow">{dictionary.recommendationsPage.eyebrow}</p>
            <h1 className="bl-reco-title">{dictionary.recommendationsPage.title}</h1>
            <p className="bl-reco-subtitle">{dictionary.recommendationsPage.subtitle}</p>

            <ProgressBar currentStep={stepIndex + 1} totalSteps={questions.length} />

            <QuizStep
              title={currentQuestion.title}
              options={currentQuestion.options}
              value={currentValue}
              onChange={applyAnswer}
            />

            <div className="bl-reco-actions">
              <button
                type="button"
                className="bl-reco-action-secondary"
                onClick={previousStep}
                disabled={stepIndex === 0}
              >
                Back
              </button>
              <button
                type="button"
                className="bl-reco-action-primary"
                onClick={nextStep}
                disabled={!currentValue}
              >
                {stepIndex === questions.length - 1 ? "See recommendations" : "Next"}
              </button>
            </div>
          </section>
        ) : (
          <>
            <ResultsHeader
              headline="Your best matches in Casablanca"
              summary={`Best matches for ${summary || "your current preferences"}`}
              topCount={topMatches.length}
              alternativesCount={alternatives.length}
            />

            <section className="bl-reco-results-section">
              <h2 className="bl-reco-section-title">Top recommendations</h2>
              <div className="bl-home-venues-grid">
                {topMatches.map(({ venue }) => (
                  <VenueCard
                    key={venue.slug}
                    category={venue.category}
                    name={venue.name}
                    area={venue.area}
                    description={venue.description}
                    href={`/venues/${venue.slug}?from=recommendations`}
                    labels={dictionary.venueCard}
                    isFeatured
                  />
                ))}
              </div>
            </section>

            {alternatives.length > 0 ? (
              <section className="bl-reco-results-section">
                <h2 className="bl-reco-section-title">Alternative picks</h2>
                <div className="bl-home-venues-grid">
                  {alternatives.map(({ venue }) => (
                    <VenueCard
                      key={venue.slug}
                      category={venue.category}
                      name={venue.name}
                      area={venue.area}
                      description={venue.description}
                      href={`/venues/${venue.slug}?from=recommendations`}
                      labels={dictionary.venueCard}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <div className="bl-reco-results-actions">
              <button type="button" className="bl-reco-action-secondary" onClick={retakeQuiz}>
                Retake quiz
              </button>
              <button
                type="button"
                className="bl-reco-action-primary"
                onClick={browseAllResults}
              >
                Browse all results
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
