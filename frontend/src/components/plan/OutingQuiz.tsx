import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { QuizStep } from "../recommendations/QuizStep";
import {
  buildAllowedAnswerValues,
  buildRecommendationSearchParams,
  clearRecommendationStateStorage,
  hydrateRecommendationState,
  persistRecommendationState,
  type QuizAnswers,
} from "../../hooks/recommendationState";
import { useI18n } from "../../i18n/useI18n";
import { formatFlowText, getFlowTexts } from "../../i18n/flowTexts";
import { getDiscoveryMoodLabel } from "../../utils/discoveryInsights";
// Re-use the existing quiz stylesheet — all .bl-reco-* classes live here
import "../../pages/RecommendationsPage.css";

type QuizQuestion = {
  id: keyof QuizAnswers;
  title: string;
  options: Array<{ value: string; label: string }>;
  stepLabel: string;
};

type OutingQuizProps = {
  onComplete: (answers: QuizAnswers) => void;
};

export function OutingQuiz({ onComplete }: OutingQuizProps) {
  const { dictionary, language } = useI18n();
  const text = getFlowTexts(language);
  const moodLabels = getDiscoveryMoodLabel(language);
  const [searchParams, setSearchParams] = useSearchParams();

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
          { value: "ain diab", label: text.recommendationsPage.optionAinDiab },
          { value: "gauthier", label: text.recommendationsPage.optionGauthier },
          { value: "old medina", label: text.recommendationsPage.optionOldMedina },
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

  const initialState = useMemo(
    () =>
      hydrateRecommendationState({
        searchParams,
        questionOrder: questions.map((question) => question.id),
        totalSteps: questions.length,
        allowedValues: allowedAnswerValues,
      }),
    // searchParams intentionally excluded — only used for initial hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allowedAnswerValues, questions],
  );

  const [stepIndex, setStepIndex] = useState(initialState.stepIndex);
  const [answers, setAnswers] = useState<QuizAnswers>(initialState.answers);

  const currentQuestion = questions[stepIndex];
  const currentValue = answers[currentQuestion.id];

  // Keep recommendation-state URL params in sync while the quiz is active.
  // These use the quiz-specific param names (vibe, category, step) which are
  // separate from PlanPage's params (mood, style, seed, stops, locks).
  useEffect(() => {
    const next = buildRecommendationSearchParams({
      currentSearchParams: searchParams,
      answers,
      stepIndex,
      isComplete: false,
    });

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [answers, searchParams, setSearchParams, stepIndex]);

  useEffect(() => {
    persistRecommendationState({ answers, stepIndex, isComplete: false });
  }, [answers, stepIndex]);

  const getLabel = (id: keyof QuizAnswers, value: string) =>
    questions
      .find((q) => q.id === id)
      ?.options.find((o) => o.value === value)?.label;

  const applyAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const nextStep = () => {
    if (!currentValue) return;

    if (stepIndex === questions.length - 1) {
      // Quiz complete — clear quiz-specific URL params and localStorage, then
      // hand control back to PlanPage via the callback.
      clearRecommendationStateStorage();
      onComplete(answers);
      return;
    }

    setStepIndex((prev) => prev + 1);
  };

  const previousStep = () => {
    if (stepIndex === 0) return;
    setStepIndex((prev) => prev - 1);
  };

  // ── Outing profile sidebar ──────────────────────────────────────────────
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

  return (
    <div className="bl-reco-shell">
      <div className="bl-reco-quiz-layout">
        {/* ── Question stage ────────────────────────────────────────── */}
        <section className="bl-reco-card">
          <p className="bl-reco-eyebrow">
            {dictionary.recommendationsPage.eyebrow}
          </p>

          {/* Branded segmented stepper */}
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

          <p className="bl-reco-hint">{text.recommendationsPage.hint}</p>

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

        {/* ── Outing profile (fills in as the user answers) ─────────── */}
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
  );
}
