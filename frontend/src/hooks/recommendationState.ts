export type QuizAnswers = {
  companion: string;
  category: string;
  budget: string;
  area: string;
  vibe: string;
};

type QuizAnswerKey = keyof QuizAnswers;

type QuizOption = {
  value: string;
};

type QuizQuestionShape = {
  id: QuizAnswerKey;
  options: QuizOption[];
};

type StoredRecommendationState = {
  version: number;
  answers: QuizAnswers;
  stepIndex: number;
  isComplete: boolean;
};

export type HydratedRecommendationState = {
  answers: QuizAnswers;
  stepIndex: number;
  isComplete: boolean;
};

const STORAGE_KEY = "blaniko:recommendations-state:v1";

const PARAM_BY_ANSWER_KEY: Record<QuizAnswerKey, string> = {
  companion: "with",
  category: "category",
  budget: "budget",
  area: "area",
  vibe: "vibe",
};

const MANAGED_QUERY_PARAMS = [...Object.values(PARAM_BY_ANSWER_KEY), "step"];

const ANSWER_KEYS = Object.keys(PARAM_BY_ANSWER_KEY) as QuizAnswerKey[];

export function createDefaultQuizAnswers(): QuizAnswers {
  return {
    companion: "",
    category: "",
    budget: "all",
    area: "",
    vibe: "",
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function allQuestionsAnswered(answers: QuizAnswers): boolean {
  return ANSWER_KEYS.every((key) => Boolean(answers[key]));
}

function getFirstUnansweredStep(questionOrder: QuizAnswerKey[], answers: QuizAnswers): number {
  const index = questionOrder.findIndex((questionId) => !answers[questionId]);
  return index === -1 ? questionOrder.length - 1 : index;
}

function parseStepParam(searchParams: URLSearchParams, maxStepIndex: number): number | null {
  const rawStep = searchParams.get("step");
  if (!rawStep) {
    return null;
  }

  const parsed = Number.parseInt(rawStep, 10);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return clamp(parsed - 1, 0, maxStepIndex);
}

function parseAnswerParams(
  searchParams: URLSearchParams,
  allowedValues: Record<QuizAnswerKey, Set<string>>
): Partial<QuizAnswers> {
  const parsed: Partial<QuizAnswers> = {};

  for (const answerKey of ANSWER_KEYS) {
    const param = PARAM_BY_ANSWER_KEY[answerKey];
    const value = searchParams.get(param);

    if (!value) {
      continue;
    }

    if (allowedValues[answerKey].has(value)) {
      parsed[answerKey] = value;
    }
  }

  return parsed;
}

function sanitizeStoredAnswers(
  rawAnswers: unknown,
  allowedValues: Record<QuizAnswerKey, Set<string>>,
  defaults: QuizAnswers
): QuizAnswers {
  const sanitized = { ...defaults };

  if (!rawAnswers || typeof rawAnswers !== "object") {
    return sanitized;
  }

  for (const answerKey of ANSWER_KEYS) {
    const value = (rawAnswers as Partial<Record<QuizAnswerKey, unknown>>)[answerKey];

    if (typeof value === "string" && allowedValues[answerKey].has(value)) {
      sanitized[answerKey] = value;
    }
  }

  return sanitized;
}

function readStoredRecommendationState(
  allowedValues: Record<QuizAnswerKey, Set<string>>,
  defaults: QuizAnswers,
  maxStepIndex: number
): StoredRecommendationState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredRecommendationState>;

    // Discard state from a different schema version — bump STORAGE_KEY when shape changes
    if (parsed.version !== 1) {
      return null;
    }

    const answers = sanitizeStoredAnswers(parsed.answers, allowedValues, defaults);

    const stepIndex =
      typeof parsed.stepIndex === "number"
        ? clamp(parsed.stepIndex, 0, maxStepIndex)
        : getFirstUnansweredStep(ANSWER_KEYS, answers);

    const isComplete = Boolean(parsed.isComplete) && allQuestionsAnswered(answers);

    return {
      version: 1,
      answers,
      stepIndex,
      isComplete,
    };
  } catch {
    return null;
  }
}

function hasAnyAnswers(partialAnswers: Partial<QuizAnswers>): boolean {
  return Object.keys(partialAnswers).length > 0;
}

export function buildAllowedAnswerValues(
  questions: QuizQuestionShape[]
): Record<QuizAnswerKey, Set<string>> {
  return questions.reduce(
    (accumulator, question) => {
      accumulator[question.id] = new Set(question.options.map((option) => option.value));
      return accumulator;
    },
    {
      companion: new Set<string>(),
      category: new Set<string>(),
      budget: new Set<string>(),
      area: new Set<string>(),
      vibe: new Set<string>(),
    }
  );
}

export function hydrateRecommendationState(options: {
  searchParams: URLSearchParams;
  questionOrder: QuizAnswerKey[];
  totalSteps: number;
  allowedValues: Record<QuizAnswerKey, Set<string>>;
}): HydratedRecommendationState {
  const { searchParams, questionOrder, totalSteps, allowedValues } = options;
  const defaults = createDefaultQuizAnswers();
  const maxStepIndex = Math.max(totalSteps - 1, 0);

  const urlAnswers = parseAnswerParams(searchParams, allowedValues);
  const hasUrlState = hasAnyAnswers(urlAnswers) || searchParams.has("step");
  const urlStep = parseStepParam(searchParams, maxStepIndex);

  const localState = readStoredRecommendationState(allowedValues, defaults, maxStepIndex);

  const mergedAnswers = hasUrlState
    ? { ...defaults, ...localState?.answers, ...urlAnswers }
    : { ...defaults, ...localState?.answers };

  const isComplete = allQuestionsAnswered(mergedAnswers);

  if (isComplete) {
    return {
      answers: mergedAnswers,
      stepIndex: maxStepIndex,
      isComplete: true,
    };
  }

  const firstUnansweredStep = getFirstUnansweredStep(questionOrder, mergedAnswers);
  const localStep = localState?.stepIndex;

  const preferredStep = hasUrlState ? urlStep ?? firstUnansweredStep : localStep ?? firstUnansweredStep;
  const restoredStep = clamp(preferredStep, 0, firstUnansweredStep);

  return {
    answers: mergedAnswers,
    stepIndex: restoredStep,
    isComplete: false,
  };
}

export function buildRecommendationSearchParams(options: {
  currentSearchParams: URLSearchParams;
  answers: QuizAnswers;
  stepIndex: number;
  isComplete: boolean;
}): URLSearchParams {
  const { currentSearchParams, answers, stepIndex, isComplete } = options;
  const nextSearchParams = new URLSearchParams(currentSearchParams);

  for (const param of MANAGED_QUERY_PARAMS) {
    nextSearchParams.delete(param);
  }

  for (const answerKey of ANSWER_KEYS) {
    const param = PARAM_BY_ANSWER_KEY[answerKey];
    const value = answers[answerKey];

    if (!value || (answerKey === "budget" && value === "all")) {
      continue;
    }

    nextSearchParams.set(param, value);
  }

  if (!isComplete && stepIndex > 0) {
    nextSearchParams.set("step", String(stepIndex + 1));
  }

  return nextSearchParams;
}

export function persistRecommendationState(options: {
  answers: QuizAnswers;
  stepIndex: number;
  isComplete: boolean;
}): void {
  if (typeof window === "undefined") {
    return;
  }

  const { answers, stepIndex, isComplete } = options;
  const payload: StoredRecommendationState = {
    version: 1,
    answers,
    stepIndex,
    isComplete,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearRecommendationStateStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
