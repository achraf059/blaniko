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
import {
  formatFlowText,
  getFlowTexts,
  getPlanStyleDisplay,
} from "../../i18n/flowTexts";
import { getDiscoveryMoodLabel } from "../../utils/discoveryInsights";
import { mapQuizAnswersToStyle, type PlanStyleId } from "../../utils/recommendationEngine";
// Re-use the existing quiz stylesheet — all .bl-reco-* classes live here
import "../../pages/RecommendationsPage.css";

type QuizOption = { value: string; label: string; description: string; wide?: boolean };

type QuizQuestion = {
  id: keyof QuizAnswers;
  title: string;
  helper: string;
  stepLabel: string;
  options: QuizOption[];
};

type OutingQuizProps = {
  onComplete: (answers: QuizAnswers) => void;
};

// Plan styles whose reveal is price-led. mapQuizAnswersToStyle never returns these
// today, but the reveal is suppressed defensively so a price-framed style can never
// surface in the quiz (V3 price safety).
const PRICE_STYLE_IDS: ReadonlySet<PlanStyleId> = new Set<PlanStyleId>([
  "under-100-mad",
]);

export function OutingQuiz({ onComplete }: OutingQuizProps) {
  const { language } = useI18n();
  const text = getFlowTexts(language);
  const reco = text.recommendationsPage;
  const quiz = reco.quiz;
  const moodLabels = getDiscoveryMoodLabel(language);
  const [searchParams, setSearchParams] = useSearchParams();

  const questions = useMemo<QuizQuestion[]>(
    () => [
      {
        id: "companion",
        title: reco.qCompanion,
        helper: quiz.helperCompanion,
        stepLabel: reco.profile.rowCompanion,
        options: [
          { value: "alone", label: reco.optionAlone, description: quiz.descCompanion.alone },
          { value: "friends", label: reco.optionFriends, description: quiz.descCompanion.friends },
          { value: "family", label: reco.optionFamily, description: quiz.descCompanion.family },
          { value: "partner", label: reco.optionPartner, description: quiz.descCompanion.partner },
        ],
      },
      {
        id: "category",
        title: reco.qCategory,
        helper: quiz.helperCategory,
        stepLabel: reco.profile.rowCategory,
        options: [
          { value: "activities", label: reco.optionActivities, description: quiz.descCategory.activities },
          { value: "sports", label: reco.optionSports, description: quiz.descCategory.sports },
          { value: "gaming", label: reco.optionGaming, description: quiz.descCategory.gaming },
          { value: "outdoor", label: reco.optionOutdoor, description: quiz.descCategory.outdoor },
          { value: "family", label: reco.optionFamily, description: quiz.descCategory.family },
          { value: "wellness", label: reco.optionWellness, description: quiz.descCategory.wellness },
        ],
      },
      // V3 price safety: budget question removed until verified prices exist.
      // Budget answer defaults to "all" via createDefaultQuizAnswers().
      //
      // V3 area safety: the Area question is temporarily removed. Every V3 venue has
      // an unknown neighborhood (venue.area resolves to "Casablanca"), so asking users
      // to pick Maârif / Ain Diab / etc. would imply precision the data does not have,
      // and the choice does not change ranking. Area defaults to the dormant "any" value
      // via createDefaultQuizAnswers(). Restore this step with verified neighborhood data.
      {
        id: "vibe",
        title: reco.qVibe,
        helper: quiz.helperVibe,
        stepLabel: reco.profile.rowVibe,
        options: [
          { value: "chill", label: moodLabels.chill, description: quiz.descVibe.chill },
          { value: "social", label: moodLabels.social, description: quiz.descVibe.social },
          { value: "active", label: moodLabels.active, description: quiz.descVibe.active },
          { value: "romantic", label: moodLabels.romantic, description: quiz.descVibe.romantic },
          {
            value: "family-friendly",
            label: moodLabels["family-friendly"],
            description: quiz.descVibe["family-friendly"],
          },
        ],
      },
    ],
    [moodLabels, quiz, reco],
  );

  // Mark the odd trailing option as full-width so grids stay balanced (vibe = 5 options).
  const questionsWithLayout = useMemo(
    () =>
      questions.map((question) => ({
        ...question,
        options: question.options.map((option, index) => ({
          ...option,
          wide:
            question.options.length % 2 === 1 &&
            index === question.options.length - 1,
        })),
      })),
    [questions],
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

  const currentQuestion = questionsWithLayout[stepIndex];
  const currentValue = answers[currentQuestion.id];
  const lastStepIndex = questions.length - 1;

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

    if (stepIndex === lastStepIndex) {
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

  // ── Derived answer state ────────────────────────────────────────────────
  const companionValue = answers.companion;
  const categoryValue = answers.category;
  const vibeValue = answers.vibe;

  const companionLabel = companionValue ? getLabel("companion", companionValue) : null;
  const categoryLabel = categoryValue ? getLabel("category", categoryValue) : null;
  const vibeLabel = vibeValue ? getLabel("vibe", vibeValue) : null;

  const answeredCount = [companionValue, categoryValue, vibeValue].filter(Boolean).length;
  const hasAnyAnswer = answeredCount > 0;
  const isComplete = Boolean(companionValue && categoryValue && vibeValue);
  const onVibeStep = stepIndex === lastStepIndex;
  // The explicit "final ready state" framing (panel title, rail badge, plan-style
  // reveal, resolved route role hints) must appear only while the user is actually
  // on the last step with every answer complete — never after pressing Back to edit
  // an earlier step. Answers stay filled either way; only the completed-state claim
  // is gated. Rows and the route still reflect information already known.
  const isReady = onVibeStep && isComplete;

  // Derive the plan style only once every answer exists, using the real engine mapping
  // and the existing localized plan-style data (never an invented mapping). The reveal is
  // suppressed if the derived style is ever price-led.
  const derivedStyleId = isComplete ? mapQuizAnswersToStyle(answers) : null;
  const styleDisplay = derivedStyleId
    ? getPlanStyleDisplay(language, derivedStyleId)
    : null;
  const showReveal = Boolean(
    isReady && styleDisplay && derivedStyleId && !PRICE_STYLE_IDS.has(derivedStyleId),
  );

  // ── Progress rail segments ──────────────────────────────────────────────
  const segments = questions.map((question, index) => {
    const value = answers[question.id];
    const answered = Boolean(value);
    const isDone = index < stepIndex;
    const isCurrent = index === stepIndex;
    const fill = isDone || answered ? "is-full" : isCurrent ? "is-partial" : "";
    return {
      id: question.id,
      index,
      answered,
      isDone,
      isCurrent,
      fill,
      chosen: answered ? getLabel(question.id, value) : null,
      stepLabel: question.stepLabel,
    };
  });

  // ── Outing profile rows ─────────────────────────────────────────────────
  const rows = [
    {
      id: "companion" as const,
      label: reco.profile.rowCompanion,
      value: companionLabel,
      prompt: quiz.promptCompanion,
      consequence: companionValue
        ? quiz.consequenceCompanion[
            companionValue as keyof typeof quiz.consequenceCompanion
          ]
        : null,
    },
    {
      id: "category" as const,
      label: reco.profile.rowCategory,
      value: categoryLabel,
      prompt: quiz.promptCategory,
      consequence: categoryValue ? quiz.consequenceCategory : null,
    },
    {
      id: "vibe" as const,
      label: reco.profile.rowVibe,
      value: vibeLabel,
      prompt: quiz.promptVibe,
      consequence: vibeValue ? quiz.consequenceVibe : null,
    },
  ];

  // ── Route spine nodes ───────────────────────────────────────────────────
  // Product rules:
  //  • Companion never resolves a route role — it only hints what will.
  //  • Category resolves the MAIN stop conceptually (the one stop chosen directly).
  //  • Start / finish stay generic until the plan style is derived (quiz complete),
  //    at which point they use the plan style's own shipped role hints.
  const startNode = {
    role: quiz.nodeStart,
    resolved: isReady,
    content:
      isReady && styleDisplay ? (
        <b>{styleDisplay.roleHints.start}</b>
      ) : companionValue ? (
        quiz.nodeSetByVibe
      ) : (
        quiz.nodeWaiting
      ),
  };
  const mainNode = {
    role: quiz.nodeMain,
    resolved: isReady || Boolean(categoryValue),
    content:
      isReady && styleDisplay && categoryLabel ? (
        <>
          <b>{styleDisplay.roleHints.main}</b>
          {" — "}
          {categoryLabel.toLowerCase()}
        </>
      ) : categoryLabel ? (
        <>
          <b>{categoryLabel}</b> {quiz.nodeMainAnchorSuffix}
        </>
      ) : companionValue ? (
        quiz.nodeSetByCategory
      ) : (
        quiz.nodeWaiting
      ),
  };
  const endNode = {
    role: quiz.nodeEnd,
    resolved: isReady,
    content:
      isReady && styleDisplay ? (
        <b>{styleDisplay.roleHints.end}</b>
      ) : companionValue ? (
        quiz.nodeSetByVibe
      ) : (
        quiz.nodeWaiting
      ),
  };
  const routeNodes = [startNode, mainNode, endNode];

  const routeCount = isReady
    ? quiz.stopsSet
    : onVibeStep && !vibeValue && categoryValue
      ? formatFlowText(quiz.stopsOpen, { count: 2 })
      : quiz.stopsTotal;

  // ── Panel title ─────────────────────────────────────────────────────────
  const panelTitle = isReady ? (
    <>
      {quiz.titleReadyPrefix}
      <em>{quiz.titleReadyEmphasis}</em>
      {quiz.titleReadySuffix}
    </>
  ) : hasAnyAnswer ? (
    <>
      {reco.profile.titleActivePrefix}
      <em>{reco.profile.titleActiveEmphasis}</em>
      {reco.profile.titleActiveSuffix}
    </>
  ) : (
    <>
      {reco.profile.titleEmptyPrefix}
      <em>{reco.profile.titleEmptyEmphasis}</em>
      {reco.profile.titleEmptySuffix}
    </>
  );

  const footSummary = hasAnyAnswer
    ? [companionLabel, categoryLabel, vibeLabel].filter(Boolean)
    : null;

  const readyToBuild = onVibeStep && Boolean(currentValue);

  return (
    <div className="bl-reco-shell">
      <div className="bl-reco-quiz-layout">
        {/* ── Left: editorial question stage ─────────────────────────── */}
        <section className="bl-reco-stage">
          <p className="bl-reco-eyebrow">{text.planPage.eyebrow}</p>
          <p className="bl-reco-promise">
            {quiz.promiseLead}
            <em>{quiz.promiseEmphasis}</em>
            {quiz.promiseTail}
          </p>

          {/* Progress rail */}
          <div
            className="bl-reco-rail"
            role="group"
            aria-label={reco.quizProgress}
          >
            <div className="bl-reco-rail-top">
              <span>
                {formatFlowText(reco.stepOf, {
                  current: stepIndex + 1,
                  total: questions.length,
                })}
              </span>
              {isReady ? (
                <span className="bl-reco-rail-ready">{quiz.ready}</span>
              ) : null}
            </div>
            <ol className="bl-reco-segs">
              {segments.map((seg) => (
                <li
                  key={seg.id}
                  className={`bl-reco-seg ${seg.isDone ? "is-done" : ""} ${
                    seg.isCurrent ? "is-current" : ""
                  }`}
                  aria-current={seg.isCurrent ? "step" : undefined}
                >
                  <span className={`bl-reco-seg-bar ${seg.fill}`} aria-hidden="true" />
                  <span className="bl-reco-seg-label">
                    {seg.answered ? (
                      <>
                        <span className="bl-reco-seg-tick" aria-hidden="true">
                          ✓
                        </span>
                        <b>{seg.chosen}</b>
                      </>
                    ) : (
                      <>
                        <span className="bl-reco-seg-num" aria-hidden="true">
                          {String(seg.index + 1).padStart(2, "0")}
                        </span>
                        {seg.stepLabel}
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <QuizStep
            title={currentQuestion.title}
            helper={currentQuestion.helper}
            options={currentQuestion.options}
            value={currentValue}
            onChange={applyAnswer}
          />

          <div className="bl-reco-actions">
            <button
              type="button"
              className={`bl-reco-action-back${stepIndex === 0 ? " is-off" : ""}`}
              onClick={previousStep}
              disabled={stepIndex === 0}
            >
              {stepIndex > 0 ? (
                <span className="bl-reco-action-arrow" aria-hidden="true">
                  ←
                </span>
              ) : null}
              {reco.back}
            </button>
            <button
              type="button"
              className={`bl-reco-action-next${currentValue ? " is-on" : ""}`}
              onClick={nextStep}
              disabled={!currentValue}
            >
              {stepIndex === lastStepIndex ? quiz.buildOuting : reco.next}
            </button>
          </div>

          {readyToBuild ? (
            <p className="bl-reco-trust">{quiz.trust}</p>
          ) : null}
        </section>

        {/* ── Right: outing profile being assembled ──────────────────── */}
        <aside className="bl-reco-panel" aria-label={reco.profile.eyebrow}>
          <div className="bl-reco-panel-pad">
            <p className="bl-reco-panel-eyebrow">{reco.profile.eyebrow}</p>
            <h2 className="bl-reco-panel-title">{panelTitle}</h2>
            <p className="bl-reco-panel-sub">{quiz.profileSub}</p>

            <div className="bl-reco-rows">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className={`bl-reco-row ${row.value ? "is-filled" : ""}`}
                >
                  <span className="bl-reco-row-label">{row.label}</span>
                  <span className="bl-reco-row-value">
                    {row.value ?? row.prompt}
                    {row.consequence ? (
                      <span className="bl-reco-row-consequence">
                        {row.consequence}
                      </span>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bl-reco-spine">
            <div className="bl-reco-spine-head">
              <span>{quiz.routeLabel}</span>
              <span className={isReady ? "is-set" : ""}>{routeCount}</span>
            </div>
            <div className="bl-reco-nodes">
              {routeNodes.map((node, index) => (
                <div
                  key={node.role}
                  className={`bl-reco-node ${node.resolved ? "is-resolved" : ""}`}
                >
                  <span className="bl-reco-node-ring" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="bl-reco-node-body">
                    <div className="bl-reco-node-role">{node.role}</div>
                    <div className="bl-reco-node-value">{node.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {showReveal && styleDisplay ? (
            <div className="bl-reco-reveal">
              <div className="bl-reco-reveal-lead">{quiz.revealLead}</div>
              <div className="bl-reco-reveal-title">{styleDisplay.label}</div>
              <div className="bl-reco-reveal-sub">{styleDisplay.subtitle}</div>
              <div className="bl-reco-reveal-note">{quiz.revealSwitch}</div>
            </div>
          ) : null}

          <p className={`bl-reco-foot ${hasAnyAnswer ? "is-on" : ""}`}>
            {footSummary ? (
              footSummary.map((label, index) => (
                <span key={`${label}-${index}`}>
                  {index > 0 ? (
                    <span className="bl-reco-foot-dot" aria-hidden="true">
                      ·
                    </span>
                  ) : null}
                  {label}
                </span>
              ))
            ) : (
              quiz.footEmpty
            )}
          </p>
        </aside>
      </div>
    </div>
  );
}
