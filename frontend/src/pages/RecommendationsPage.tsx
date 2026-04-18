import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueCard } from "../components/home/VenueCard";
import { ProgressBar } from "../components/recommendations/ProgressBar";
import { QuizStep } from "../components/recommendations/QuizStep";
import { ResultsHeader } from "../components/recommendations/ResultsHeader";
import {
  buildAllowedAnswerValues,
  buildRecommendationSearchParams,
  clearRecommendationStateStorage,
  createDefaultQuizAnswers,
  hydrateRecommendationState,
  persistRecommendationState,
  type QuizAnswers,
} from "../hooks/recommendationState";
import { useFavorites } from "../hooks/useFavorites";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import "./HomePage.css";
import "./RecommendationsPage.css";

type QuizQuestion = {
  id: keyof QuizAnswers;
  title: string;
  options: Array<{ value: string; label: string }>;
  description?: string;
};

const QUESTIONS: QuizQuestion[] = [
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

export default function RecommendationsPage() {
  const { dictionary } = useI18n();
  const navigate = useNavigate();
  const { venues } = useVenues();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [searchParams, setSearchParams] = useSearchParams();
  const [shareFeedback, setShareFeedback] = useState<"idle" | "copied" | "failed">("idle");

  const questions = QUESTIONS;

  const allowedAnswerValues = useMemo(
    () =>
      buildAllowedAnswerValues(
        questions.map((question) => ({
          id: question.id,
          options: question.options.map((option) => ({ value: option.value })),
        }))
      ),
    [questions]
  );

  const initialRecommendationState = useMemo(
    () =>
      hydrateRecommendationState({
        searchParams,
        questionOrder: questions.map((question) => question.id),
        totalSteps: questions.length,
        allowedValues: allowedAnswerValues,
      }),
    [allowedAnswerValues, questions, searchParams]
  );

  const [stepIndex, setStepIndex] = useState(initialRecommendationState.stepIndex);
  const [isComplete, setIsComplete] = useState(initialRecommendationState.isComplete);
  const [answers, setAnswers] = useState<QuizAnswers>(initialRecommendationState.answers);

  const currentQuestion = questions[stepIndex];
  const currentValue = answers[currentQuestion.id];

  useEffect(() => {
    const nextSearchParams = buildRecommendationSearchParams({
      currentSearchParams: searchParams,
      answers,
      stepIndex,
      isComplete,
    });

    if (nextSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [answers, isComplete, searchParams, setSearchParams, stepIndex]);

  useEffect(() => {
    persistRecommendationState({ answers, stepIndex, isComplete });
  }, [answers, isComplete, stepIndex]);

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
  }, [answers, venues]);

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
    setAnswers(createDefaultQuizAnswers());
    setStepIndex(0);
    setIsComplete(false);
    clearRecommendationStateStorage();

    const nextSearchParams = buildRecommendationSearchParams({
      currentSearchParams: searchParams,
      answers: createDefaultQuizAnswers(),
      stepIndex: 0,
      isComplete: false,
    });

    if (nextSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(nextSearchParams, { replace: true });
    }
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

  const browseMapResults = () => {
    const params = new URLSearchParams();

    if (answers.category) {
      params.set("category", answers.category);
    }

    if (answers.budget && answers.budget !== "all") {
      params.set("budget", answers.budget);
    }

    const suffix = params.toString();
    navigate(suffix ? `/map?${suffix}` : "/map");
  };

  const copyResultsLink = async () => {
    if (typeof window === "undefined") {
      return;
    }

    const link = window.location.href;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = link;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setShareFeedback("copied");
    } catch {
      setShareFeedback("failed");
    }

    window.setTimeout(() => {
      setShareFeedback("idle");
    }, 2200);
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
                    slug={venue.slug}
                    category={venue.category}
                    name={venue.name}
                    area={venue.area}
                    description={venue.description}
                    href={`/venues/${venue.slug}?from=recommendations`}
                    labels={dictionary.venueCard}
                    isFeatured
                    isFavorite={isFavorite(venue.slug)}
                    onToggleFavorite={toggleFavorite}
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
                      slug={venue.slug}
                      category={venue.category}
                      name={venue.name}
                      area={venue.area}
                      description={venue.description}
                      href={`/venues/${venue.slug}?from=recommendations`}
                      labels={dictionary.venueCard}
                      isFavorite={isFavorite(venue.slug)}
                      onToggleFavorite={toggleFavorite}
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
                className="bl-reco-action-secondary"
                onClick={copyResultsLink}
              >
                Copy results link
              </button>
              <button
                type="button"
                className="bl-reco-action-secondary"
                onClick={browseMapResults}
              >
                {dictionary.header.map}
              </button>
              <button
                type="button"
                className="bl-reco-action-primary"
                onClick={browseAllResults}
              >
                Browse all results
              </button>
            </div>

            {shareFeedback !== "idle" ? (
              <p className="bl-reco-share-feedback" role="status" aria-live="polite">
                {shareFeedback === "copied"
                  ? "Share link copied to your clipboard."
                  : "Could not copy automatically. Please copy the URL from your browser."}
              </p>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
