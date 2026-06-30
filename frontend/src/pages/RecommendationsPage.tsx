import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueCard, VenueCardSkeleton } from "../components/home/VenueCard";
import { usePageMeta } from "../hooks/usePageMeta";
// NOTE: ProgressBar import removed — the questionnaire now renders its own
// branded segmented stepper inline (see the .bl-reco-stepper block below).
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
import { getVenueDisplay } from "../data/mockData";
import { useFavorites } from "../hooks/useFavorites";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import { formatFlowText, getFlowTexts } from "../i18n/flowTexts";
import {
  getDiscoveryMoodLabel,
  isDiscoveryMood,
} from "../utils/discoveryInsights";
import { getVenueImageSrc } from "../utils/venueImage";
import "./RecommendationsPage.css";

type QuizQuestion = {
  id: keyof QuizAnswers;
  title: string;
  options: Array<{ value: string; label: string }>;
  description?: string;
  // short label used by the segmented stepper (existing copy reused)
  stepLabel: string;
};

export default function RecommendationsPage() {
  const { dictionary, language } = useI18n();
  const text = getFlowTexts(language);
  const moodLabels = getDiscoveryMoodLabel(language);
  const navigate = useNavigate();

  usePageMeta(
    language === "fr"
      ? "Suggestions personnalisées | Blaniko"
      : "Personalized picks | Blaniko",
  );
  const { venues, isLoading } = useVenues();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [searchParams, setSearchParams] = useSearchParams();
  const [shareFeedback, setShareFeedback] = useState<
    "idle" | "copied" | "failed"
  >("idle");

  const questions = useMemo<QuizQuestion[]>(
    () => [
      {
        id: "companion",
        title: text.recommendationsPage.qCompanion,
        stepLabel: text.recommendationsPage.profile.rowCompanion,
        options: [
          { value: "alone", label: text.recommendationsPage.optionAlone },
          { value: "friends", label: text.recommendationsPage.optionFriends },
          { value: "family", label: text.recommendationsPage.optionFamily },
          { value: "partner", label: text.recommendationsPage.optionPartner },
        ],
      },
      {
        id: "category",
        title: text.recommendationsPage.qCategory,
        stepLabel: text.recommendationsPage.profile.rowCategory,
        options: [
          { value: "activities", label: text.recommendationsPage.optionActivities },
          { value: "sports", label: text.recommendationsPage.optionSports },
          { value: "gaming", label: text.recommendationsPage.optionGaming },
          { value: "outdoor", label: text.recommendationsPage.optionOutdoor },
          { value: "family", label: text.recommendationsPage.optionFamily },
        ],
      },
      {
        id: "budget",
        title: text.recommendationsPage.qBudget,
        stepLabel: text.recommendationsPage.profile.rowBudget,
        options: [
          { value: "all", label: text.common.all },
          { value: "$", label: "$" },
          { value: "$$", label: "$$" },
          { value: "$$$", label: "$$$" },
        ],
      },
      {
        id: "area",
        title: text.recommendationsPage.qArea,
        stepLabel: text.recommendationsPage.profile.rowArea,
        options: [
          { value: "any", label: text.recommendationsPage.optionAny },
          { value: "maarif", label: text.recommendationsPage.optionMaarif },
          {
            value: "ain diab",
            label: text.recommendationsPage.optionAinDiab,
          },
          {
            value: "gauthier",
            label: text.recommendationsPage.optionGauthier,
          },
          {
            value: "old medina",
            label: text.recommendationsPage.optionOldMedina,
          },
        ],
      },
      {
        id: "vibe",
        title: text.recommendationsPage.qVibe,
        stepLabel: text.recommendationsPage.profile.rowVibe,
        options: [
          { value: "chill", label: moodLabels.chill },
          { value: "social", label: moodLabels.social },
          { value: "active", label: moodLabels.active },
          { value: "romantic", label: moodLabels.romantic },
          { value: "family-friendly", label: moodLabels["family-friendly"] },
        ],
      },
    ],
    [moodLabels, text],
  );

  const allowedAnswerValues = useMemo(
    () =>
      buildAllowedAnswerValues(
        questions.map((question) => ({
          id: question.id,
          options: question.options.map((option) => ({ value: option.value })),
        })),
      ),
    [questions],
  );

  const initialRecommendationState = useMemo(
    () =>
      hydrateRecommendationState({
        searchParams,
        questionOrder: questions.map((question) => question.id),
        totalSteps: questions.length,
        allowedValues: allowedAnswerValues,
      }),
    [allowedAnswerValues, questions, searchParams],
  );

  const [stepIndex, setStepIndex] = useState(
    initialRecommendationState.stepIndex,
  );
  const [isComplete, setIsComplete] = useState(
    initialRecommendationState.isComplete,
  );
  const [answers, setAnswers] = useState<QuizAnswers>(
    initialRecommendationState.answers,
  );

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
      friends: [
        "friends",
        "groups",
        "students",
        "young professionals",
        "gamers",
      ],
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
            audienceText.includes(keyword),
          );
          if (match) {
            score += 2;
          }
        }

        const vibeText =
          `${venue.vibe ?? ""} ${venue.description}`.toLowerCase();
        if (answers.vibe) {
          const match = vibeKeywords[answers.vibe]?.some((keyword) =>
            vibeText.includes(keyword),
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
  const selectedMood = isDiscoveryMood(answers.vibe) ? answers.vibe : undefined;

  const summary = [
    getLabel("companion", answers.companion),
    getLabel("category", answers.category),
    getLabel("budget", answers.budget),
    getLabel("area", answers.area),
    getLabel("vibe", answers.vibe),
  ]
    .filter(Boolean)
    .join(" • ");

  // ── Outing-profile derived data (questionnaire aside) ──────────────────
  const profileRows = questions.map((question) => {
    const value = answers[question.id];
    return {
      id: question.id,
      label: question.stepLabel,
      value: value ? getLabel(question.id, value) : null,
    };
  });
  const answeredCount = profileRows.filter((row) => row.value).length;
  const hasAnyAnswer = answeredCount > 0;
  const profileSummary = profileRows
    .filter((row) => row.value)
    .map((row) => row.value)
    .join(" · ");
  const visualCaption =
    (answers.category && getLabel("category", answers.category)) ||
    (answers.companion && getLabel("companion", answers.companion)) ||
    text.recommendationsPage.profile.visualDefault;

  const buildVenueHref = (slug: string) => {
    const params = new URLSearchParams();
    params.set("from", "recommendations");

    if (answers.companion) {
      params.set("with", answers.companion);
    }

    if (answers.category) {
      params.set("category", answers.category);
    }

    if (answers.budget) {
      params.set("budget", answers.budget);
    }

    if (answers.area) {
      params.set("area", answers.area);
    }

    if (answers.vibe) {
      params.set("mood", answers.vibe);
    }

    return `/venues/${slug}?${params.toString()}`;
  };

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

    if (answers.vibe) {
      params.set("mood", answers.vibe);
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

    if (answers.vibe) {
      params.set("mood", answers.vibe);
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
          <div className="bl-reco-shell">
          <div className="bl-reco-quiz-layout">
            {/* ── Question stage ─────────────────────────────────────── */}
            <section className="bl-reco-card">
              <p className="bl-reco-eyebrow">
                {dictionary.recommendationsPage.eyebrow}
              </p>

              {/* Branded segmented stepper (replaces ProgressBar) */}
              <div
                className="bl-reco-stepper"
                role="group"
                aria-label={text.recommendationsPage.quizProgress}
              >
                <div className="bl-reco-stepper-top">
                  <span>
                    {formatFlowText(text.recommendationsPage.stepOf, {
                      current: stepIndex + 1,
                      total: questions.length,
                    })}
                  </span>
                  <span className="bl-reco-stepper-pct">
                    {Math.round(((stepIndex + 1) / questions.length) * 100)}%
                  </span>
                </div>
                <ol className="bl-reco-stepper-track">
                  {questions.map((question, index) => {
                    const state =
                      index < stepIndex
                        ? "is-done"
                        : index === stepIndex
                          ? "is-current"
                          : "";
                    const chosen = answers[question.id]
                      ? getLabel(question.id, answers[question.id])
                      : null;
                    return (
                      <li
                        key={question.id}
                        className={`bl-reco-stepper-node ${state}`}
                        aria-current={index === stepIndex ? "step" : undefined}
                      >
                        <span className="bl-reco-stepper-bar" aria-hidden="true" />
                        <span className="bl-reco-stepper-meta">
                          <span className="bl-reco-stepper-dot" aria-hidden="true">
                            {index < stepIndex ? "✓" : index + 1}
                          </span>
                          <span className="bl-reco-stepper-label">
                            {index < stepIndex && chosen
                              ? chosen
                              : question.stepLabel}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* Framing hint line */}
              <p className="bl-reco-hint">{text.recommendationsPage.hint}</p>

              {/* Question hero + option cards (QuizStep, styled via CSS) */}
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
                  {text.recommendationsPage.back}
                </button>
                <button
                  type="button"
                  className="bl-reco-action-primary"
                  onClick={nextStep}
                  disabled={!currentValue}
                >
                  {stepIndex === questions.length - 1
                    ? text.recommendationsPage.seeRecommendations
                    : text.recommendationsPage.next}
                </button>
              </div>
            </section>

            {/* ── Outing profile (builds as the user answers) ──────────── */}
            <aside
              className="bl-reco-profile"
              aria-label={text.recommendationsPage.profile.eyebrow}
            >
              <div className="bl-reco-profile-pad">
                <p className="bl-reco-profile-eyebrow">
                  {text.recommendationsPage.profile.eyebrow}
                </p>
                <h2 className="bl-reco-profile-title">
                  {hasAnyAnswer ? (
                    <>
                      {text.recommendationsPage.profile.titleActivePrefix}
                      <em>{text.recommendationsPage.profile.titleActiveEmphasis}</em>
                      {text.recommendationsPage.profile.titleActiveSuffix}
                    </>
                  ) : (
                    <>
                      {text.recommendationsPage.profile.titleEmptyPrefix}
                      <em>{text.recommendationsPage.profile.titleEmptyEmphasis}</em>
                      {text.recommendationsPage.profile.titleEmptySuffix}
                    </>
                  )}
                </h2>

                <div
                  className="bl-reco-profile-visual"
                  style={{
                    filter: `saturate(${1 + answeredCount * 0.06}) brightness(${
                      1 + answeredCount * 0.012
                    })`,
                  }}
                >
                  <span className="bl-reco-profile-cap">{visualCaption}</span>
                </div>

                <div className="bl-reco-profile-list">
                  {profileRows.map((row) => (
                    <div
                      key={row.id}
                      className={`bl-reco-attr ${row.value ? "is-filled" : ""}`}
                    >
                      <span className="bl-reco-attr-label">{row.label}</span>
                      <span className="bl-reco-attr-value">
                        {row.value ?? text.common.noDataDash}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="bl-reco-profile-sentence">
                {hasAnyAnswer
                  ? profileSummary
                  : text.recommendationsPage.profile.empty}
              </p>
            </aside>
          </div>
          </div>
        ) : (
          <>
            <ResultsHeader
              eyebrow={text.recommendationsPage.resultsEyebrow}
              headline={text.recommendationsPage.headline}
              summary={formatFlowText(text.recommendationsPage.summaryBuiltFor, {
                summary: summary || text.recommendationsPage.summaryFallback,
              })}
              topCount={topMatches.length}
              alternativesCount={alternatives.length}
              topCountLabel={(count) =>
                formatFlowText(text.recommendationsPage.topMatchesCount, {
                  count,
                })
              }
              alternativesCountLabel={(count) =>
                formatFlowText(text.recommendationsPage.backupsCount, {
                  count,
                })
              }
            />

            {selectedMood ? (
              <p className="bl-reco-mood-summary">
                {text.recommendationsPage.modePrefix}{" "}
                <strong>{moodLabels[selectedMood]}</strong>
                {text.recommendationsPage.modeSuffix}
              </p>
            ) : null}

            <section className="bl-reco-results-section">
              <h2 className="bl-reco-section-title">
                {text.recommendationsPage.topMatches}
              </h2>
              <div className="bl-home-venues-grid">
                {isLoading
                  ? Array.from({ length: 3 }, (_, i) => (
                      <VenueCardSkeleton key={i} />
                    ))
                  : topMatches.map(({ venue }) => {
                      const vd = getVenueDisplay(venue, language);
                      return (
                        <VenueCard
                          key={venue.slug}
                          slug={venue.slug}
                          category={dictionary.categoryNames[venue.categorySlug] ?? venue.category}
                          name={venue.name}
                          area={venue.area}
                          description={vd.description}
                          imageUrl={getVenueImageSrc(venue)}
                          personality={{
                            bestForTags: venue.bestForTags,
                            timeOfDay: venue.timeOfDay,
                            energyLevel: venue.energyLevel,
                            socialLevel: venue.socialLevel,
                            spaceType: venue.spaceType,
                          }}
                          href={buildVenueHref(venue.slug)}
                          language={language}
                          labels={dictionary.venueCard}
                          isFeatured
                          isFavorite={isFavorite(venue.slug)}
                          onToggleFavorite={toggleFavorite}
                        />
                      );
                    })}
              </div>
            </section>

            {isLoading || alternatives.length > 0 ? (
              <section className="bl-reco-results-section">
                <h2 className="bl-reco-section-title">
                  {text.recommendationsPage.alternatives}
                </h2>
                <div className="bl-home-venues-grid">
                  {isLoading
                    ? Array.from({ length: 5 }, (_, i) => (
                        <VenueCardSkeleton key={i} />
                      ))
                    : alternatives.map(({ venue }) => {
                        const vd = getVenueDisplay(venue, language);
                        return (
                          <VenueCard
                            key={venue.slug}
                            slug={venue.slug}
                            category={dictionary.categoryNames[venue.categorySlug] ?? venue.category}
                            name={venue.name}
                            area={venue.area}
                            description={vd.description}
                            imageUrl={getVenueImageSrc(venue)}
                            personality={{
                              bestForTags: venue.bestForTags,
                              timeOfDay: venue.timeOfDay,
                              energyLevel: venue.energyLevel,
                              socialLevel: venue.socialLevel,
                              spaceType: venue.spaceType,
                            }}
                            href={buildVenueHref(venue.slug)}
                            language={language}
                            labels={dictionary.venueCard}
                            isFavorite={isFavorite(venue.slug)}
                            onToggleFavorite={toggleFavorite}
                          />
                        );
                      })}
                </div>
              </section>
            ) : null}

            <div className="bl-reco-results-actions">
              <button
                type="button"
                className="bl-reco-action-secondary"
                onClick={retakeQuiz}
              >
                {text.recommendationsPage.retake}
              </button>
              <button
                type="button"
                className="bl-reco-action-secondary"
                onClick={copyResultsLink}
              >
                {text.recommendationsPage.copyLink}
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
                {text.recommendationsPage.openFullResults}
              </button>
              <button
                type="button"
                className="bl-reco-action-primary"
                onClick={() => navigate("/plan")}
              >
                {text.recommendationsPage.planOuting}
              </button>
            </div>

            {shareFeedback !== "idle" ? (
              <p
                className="bl-reco-share-feedback"
                role="status"
                aria-live="polite"
              >
                {shareFeedback === "copied"
                  ? text.recommendationsPage.copied
                  : text.recommendationsPage.copyFailed}
              </p>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
