/**
 * Question Engine — core logic (Milestone 4A foundation).
 *
 * Pure functions only: every function here takes a `QuestionFlow` and/or a
 * `PatientAnswerState` and returns a *new* state or a plain result, without
 * mutating its inputs and without any React/UI dependency. This is what
 * makes the engine independently unit-testable and reusable across the
 * kiosk UI, a future voice interface, or a doctor-side replay view.
 *
 * `QuestionEngine` (in `QuestionEngine.ts`) is a thin stateful wrapper
 * around these functions for convenience in UI code.
 */

import type {
  AdvanceResult,
  AnswerValue,
  PatientAnswerState,
  QuestionDefinition,
  QuestionFlow,
  SubmitResult,
} from "./types";

/** Creates a fresh, empty answer state at the start of a flow. */
export function createInitialState(
  flow: QuestionFlow,
  complaint: string | null = flow.id
): PatientAnswerState {
  return {
    complaint,
    answers: {},
    currentQuestionId: flow.firstQuestionId,
    history: [],
    completedFields: [],
    isComplete: flow.firstQuestionId === null,
  };
}

function getQuestion(
  flow: QuestionFlow,
  questionId: string
): QuestionDefinition {
  const question = flow.questions[questionId];
  if (!question) {
    throw new Error(
      `Question Engine: unknown question ID "${questionId}" in flow "${flow.id}"`
    );
  }
  return question;
}

/** Returns the question currently being asked, or null if the flow is complete. */
export function getCurrentQuestion(
  flow: QuestionFlow,
  state: PatientAnswerState
): QuestionDefinition | null {
  if (!state.currentQuestionId) return null;
  return getQuestion(flow, state.currentQuestionId);
}

/** Deep-enough equality for the answer value types the engine supports. */
function valuesEqual(a: AnswerValue, b: AnswerValue): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return a === b;
}

/**
 * Resolves which question should come after `question`, given the answers
 * recorded so far. Conditional branches are checked first (first match
 * wins); otherwise the question's default `nextQuestionId` is used. This is
 * also how conditional questions get skipped — if no branch or default
 * points at them, they're simply never visited.
 */
export function resolveNextQuestionId(
  question: QuestionDefinition,
  answers: Record<string, AnswerValue>
): string | null {
  if (question.branches) {
    for (const branch of question.branches) {
      if (valuesEqual(answers[branch.field] ?? null, branch.equals)) {
        return branch.nextQuestionId;
      }
    }
  }
  return question.nextQuestionId;
}

/** Validates a candidate answer against a question's expected answer type. */
export function validateAnswer(
  question: QuestionDefinition,
  value: AnswerValue
): SubmitResult {
  const isEmpty =
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0);

  if (question.required && isEmpty) {
    return { ok: false, error: "This question requires an answer." };
  }

  // Optional + empty is valid (nothing further to check).
  if (isEmpty) return { ok: true };

  switch (question.answerType) {
    case "number":
      if (typeof value !== "number" || Number.isNaN(value)) {
        return { ok: false, error: "Expected a numeric answer." };
      }
      break;
    case "boolean":
      if (typeof value !== "boolean") {
        return { ok: false, error: "Expected a yes/no answer." };
      }
      break;
    case "text":
    case "date":
      if (typeof value !== "string") {
        return { ok: false, error: "Expected a text answer." };
      }
      break;
    case "single_select": {
      if (typeof value !== "string") {
        return { ok: false, error: "Expected a single selected option." };
      }
      const validValues = (question.options ?? []).map((o) => o.value);
      if (!validValues.includes(value)) {
        return { ok: false, error: `"${value}" is not a valid option.` };
      }
      break;
    }
    case "multi_select": {
      if (!Array.isArray(value)) {
        return { ok: false, error: "Expected a list of selected options." };
      }
      const validValues = (question.options ?? []).map((o) => o.value);
      const invalid = value.filter((v) => !validValues.includes(v));
      if (invalid.length > 0) {
        return {
          ok: false,
          error: `Invalid option(s): ${invalid.join(", ")}.`,
        };
      }
      break;
    }
  }

  return { ok: true };
}

/**
 * Records an answer for the currently active question, without moving the
 * flow forward. Use `goToNext` afterwards to advance. Kept separate from
 * advancing so a caller can validate/persist an answer (e.g. show an
 * inline error) before deciding to move on.
 */
export function submitAnswer(
  flow: QuestionFlow,
  state: PatientAnswerState,
  value: AnswerValue
): { state: PatientAnswerState; result: SubmitResult } {
  const question = getCurrentQuestion(flow, state);
  if (!question) {
    return {
      state,
      result: { ok: false, error: "The flow has already finished." },
    };
  }

  const result = validateAnswer(question, value);
  if (!result.ok) {
    return { state, result };
  }

  const nextAnswers = { ...state.answers, [question.field]: value };
  const nextCompleted = state.completedFields.includes(question.field)
    ? state.completedFields
    : [...state.completedFields, question.field];

  return {
    state: {
      ...state,
      answers: nextAnswers,
      completedFields: nextCompleted,
    },
    result,
  };
}

/**
 * Moves the flow forward from the current question to whichever question
 * comes next (resolving conditional branches, and thereby skipping any
 * question that isn't reachable). The current question must already have a
 * recorded answer, or be optional, or this returns an error without
 * changing state.
 */
export function goToNext(
  flow: QuestionFlow,
  state: PatientAnswerState
): { state: PatientAnswerState; result: AdvanceResult } {
  const question = getCurrentQuestion(flow, state);
  if (!question) {
    return { state, result: { ok: false, error: "The flow has already finished." } };
  }

  const currentAnswer = state.answers[question.field] ?? null;
  const validation = validateAnswer(question, currentAnswer);
  if (!validation.ok) {
    return { state, result: { ok: false, error: validation.error } };
  }

  const nextId = resolveNextQuestionId(question, state.answers);

  return {
    state: {
      ...state,
      history: [...state.history, question.id],
      currentQuestionId: nextId,
      isComplete: nextId === null,
    },
    result: { ok: true },
  };
}

/**
 * Moves back to the previously-answered question. The previous answer is
 * left in place (so the patient sees what they entered and can change it),
 * and the flow is marked incomplete again since it's no longer at the end.
 * No-op (returns ok: false) if there's no history to go back to.
 */
export function goBack(
  flow: QuestionFlow,
  state: PatientAnswerState
): { state: PatientAnswerState; result: AdvanceResult } {
  if (state.history.length === 0) {
    return { state, result: { ok: false, error: "There is no previous question." } };
  }

  const previousId = state.history[state.history.length - 1];
  const newHistory = state.history.slice(0, -1);
  // Ensure referenced question exists (throws a clear error otherwise).
  getQuestion(flow, previousId);

  return {
    state: {
      ...state,
      history: newHistory,
      currentQuestionId: previousId,
      isComplete: false,
    },
    result: { ok: true },
  };
}

/**
 * Changes the answer to a question that was already answered (identified
 * by field name, not necessarily the current question). Because branching
 * decisions may have been made based on the old value, any history/current
 * position *after* that question is discarded — the patient re-walks the
 * flow forward from that point using the new answer, and the engine will
 * ask (or skip) the appropriate follow-up questions again.
 */
export function changeAnswer(
  flow: QuestionFlow,
  state: PatientAnswerState,
  field: string,
  value: AnswerValue
): { state: PatientAnswerState; result: SubmitResult } {
  // Find which question owns this field.
  const owningQuestion = Object.values(flow.questions).find(
    (q) => q.field === field
  );
  if (!owningQuestion) {
    return {
      state,
      result: { ok: false, error: `No question in this flow uses field "${field}".` },
    };
  }
  if (!state.completedFields.includes(field)) {
    return {
      state,
      result: { ok: false, error: `"${field}" has not been answered yet.` },
    };
  }

  const validation = validateAnswer(owningQuestion, value);
  if (!validation.ok) {
    return { state, result: validation };
  }

  const positionInHistory = state.history.indexOf(owningQuestion.id);

  const truncatedHistory =
    positionInHistory === -1 ? state.history : state.history.slice(0, positionInHistory);

  const keptFieldsFromHistory = truncatedHistory.map(
    (id) => getQuestion(flow, id).field
  );
  const keptFields = new Set([...keptFieldsFromHistory, field]);

  const nextAnswers: Record<string, AnswerValue> = {};
  for (const key of Object.keys(state.answers)) {
    if (keptFields.has(key)) {
      nextAnswers[key] = key === field ? value : state.answers[key];
    }
  }
  if (!(field in nextAnswers)) {
    nextAnswers[field] = value;
  }

  const nextCompleted = state.completedFields.filter((f) => keptFields.has(f));

  return {
    state: {
      ...state,
      answers: nextAnswers,
      completedFields: nextCompleted,
      history: truncatedHistory,
      currentQuestionId: owningQuestion.id,
      isComplete: false,
    },
    result: { ok: true },
  };
}

export function correctAnswer(
  flow: QuestionFlow,
  state: PatientAnswerState,
  field: string,
  value: AnswerValue
): { state: PatientAnswerState; result: SubmitResult } {
  const question = Object.values(flow.questions).find((q) => q.field === field);
  if (!question) return { state, result: { ok: false, error: `No question in this flow uses field "${field}".` } };
  if (!state.completedFields.includes(field)) return { state, result: { ok: false, error: `"${field}" has not been answered yet.` } };
  const validation = validateAnswer(question, value);
  if (!validation.ok) return { state, result: validation };
  return { state: { ...state, answers: { ...state.answers, [field]: value } }, result: { ok: true } };
}

/** Whether the flow has reached its end. */
export function isFlowComplete(state: PatientAnswerState): boolean {
  return state.isComplete;
}

/**
 * Estimates progress through the flow as a number from 0 to 1.
 *
 * Flows can branch, so there is no single fixed question count to divide
 * by. This heuristic instead counts how many questions have already been
 * answered, plus how many more are left on the *default* path from here
 * (ignoring branches we can't predict yet, since we don't know future
 * answers). It is intentionally approximate — good enough to drive a
 * progress bar, not a precise fraction.
 */
export function calculateProgress(
  flow: QuestionFlow,
  state: PatientAnswerState
): number {
  const answeredCount = state.completedFields.length;

  if (state.isComplete) return 1;
  if (answeredCount === 0 && !state.currentQuestionId) return 0;

  let remaining = 0;
  let cursor = state.currentQuestionId;
  const seen = new Set<string>();

  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    remaining += 1;
    const question = flow.questions[cursor];
    if (!question) break;
    cursor = question.nextQuestionId;
  }

  const total = answeredCount + remaining;
  if (total === 0) return 0;

  return answeredCount / total;
}
