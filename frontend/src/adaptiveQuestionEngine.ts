import {
  getQuestionsForConcepts,
  type AdaptiveConcept,
  type AdaptiveQuestion,
} from "./adaptiveQuestionBank";

import { detectAdaptiveConcepts } from "./adaptiveConceptDetector";
import { extractAdaptiveInfo } from "./adaptiveExtractor";
export type { AdaptiveQuestion } from "./adaptiveQuestionBank";

export interface AdaptiveAnalysis {
  originalText: string;
  concepts: AdaptiveConcept[];
  matchedTerms: string[];
  duration?: string;
  severity?: string;
  questions: AdaptiveQuestion[];
}

export interface AdaptiveState {
  analysis: AdaptiveAnalysis;
  answeredQuestionIds: string[];
  answers: Record<string, string>;
}

/**
 * Analyze the patient's initial free-text complaint.
 */
export function analyzePatientInput(
  text: string,
): AdaptiveAnalysis {
  const matches = detectAdaptiveConcepts(text);

  const concepts: AdaptiveConcept[] =
    matches.length > 0
      ? matches.map((match) => match.concept)
      : ["unknown"];

  const extracted = extractAdaptiveInfo(text, concepts);

  const questions =
    concepts[0] === "unknown"
      ? []
      : getQuestionsForConcepts(concepts);

  return {
    originalText: text,
    concepts,
    matchedTerms: matches.flatMap(
      (match) => match.matchedTerms,
    ),
    duration: extracted.duration,
    severity: extracted.severity,
    questions,
  };
}

/**
 * Create a new adaptive session.
 */
export function createAdaptiveState(
  analysis: AdaptiveAnalysis,
): AdaptiveState {
  return {
    analysis,
    answeredQuestionIds: [],
    answers: {},
  };
}

/**
 * Mark an adaptive question as answered.
 */
export function recordAdaptiveAnswer(
  state: AdaptiveState,
  questionId: string,
  answer: string,
): AdaptiveState {
  return {
    ...state,
    answeredQuestionIds: state.answeredQuestionIds.includes(
      questionId,
    )
      ? state.answeredQuestionIds
      : [...state.answeredQuestionIds, questionId],
    answers: {
      ...state.answers,
      [questionId]: answer,
    },
  };
}

/**
 * Determine the next relevant adaptive question.
 *
 * Questions already answered are skipped.
 */
export function getNextAdaptiveQuestion(
  state: AdaptiveState,
): AdaptiveQuestion | null {
  const unanswered = state.analysis.questions.filter(
    (question) =>
      !state.answeredQuestionIds.includes(question.id),
  );

  if (unanswered.length === 0) {
    return null;
  }

  /*
   * Highest-priority unanswered question wins.
   *
   * The question bank already assigns higher priority
   * to safety-relevant questions.
   */
  return [...unanswered].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  )[0];
}

/**
 * Decide whether a question should be skipped because
 * the initial patient statement already contained the
 * requested information.
 */
export function shouldSkipQuestion(
  question: AdaptiveQuestion,
  analysis: AdaptiveAnalysis,
): boolean {
  const text = analysis.originalText.toLowerCase();

  // Duration was already provided.
  if (
    question.id.includes("duration") &&
    analysis.duration
  ) {
    return true;
  }

  // Severity was already provided.
  if (
    question.id.includes("severity") &&
    analysis.severity
  ) {
    return true;
  }

  // Avoid asking generic pain questions when the patient
  // already described a more specific complaint.
  if (
    question.id === "pain_location" &&
    analysis.concepts.some(
      (concept) =>
        concept !== "pain" &&
        concept !== "unknown",
    )
  ) {
    return true;
  }

  /*
   * Basic phrase-level checks for information already
   * explicitly stated by the patient.
   */
  if (
    question.id === "fever_temperature" &&
    /\b\d{2,3}(?:\.\d+)?\s*(?:°?\s*c|degree|degrees)\b/i.test(
      text,
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Return the next question after removing information
 * that the patient has already supplied.
 */
export function getNextRelevantAdaptiveQuestion(
  state: AdaptiveState,
): AdaptiveQuestion | null {
  const candidates = state.analysis.questions.filter(
    (question) =>
      !state.answeredQuestionIds.includes(question.id) &&
      !shouldSkipQuestion(
        question,
        state.analysis,
      ),
  );

  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  )[0];
}

/**
 * Answer-dependent follow-up rules.
 *
 * These rules do not diagnose the patient.
 * They only determine which existing clinical
 * question should become more relevant next.
 */
export function getAnswerDependentConcepts(
  question: AdaptiveQuestion,
  answer: string,
): AdaptiveConcept[] {
  const normalized = answer.trim().toLowerCase();

  const concepts = new Set<AdaptiveConcept>();

  for (const concept of question.concepts) {
    concepts.add(concept);
  }

  const yes =
    normalized === "yes" ||
    normalized === "haan" ||
    normalized === "हाँ";

  if (!yes) {
    return [...concepts];
  }

  switch (question.id) {
    case "abd_vomiting":
      concepts.add("vomiting");
      break;

    case "abd_blood":
      concepts.add("bleeding");
      break;

    case "chest_breathing":
      concepts.add("breathing");
      break;

    case "fever_rash":
      concepts.add("rash");
      break;

    case "cough_breathing":
      concepts.add("breathing");
      break;

    case "cough_blood":
      concepts.add("bleeding");
      break;

    case "diarrhea_pain":
      concepts.add("abdominal_pain");
      break;

    case "joint_swelling":
      concepts.add("swelling");
      break;

    case "back_weakness":
      concepts.add("weakness");
      break;

    case "headache_nausea":
      concepts.add("vomiting");
      break;
  }

  return [...concepts];
}

/**
 * Expand the question set after an answer reveals
 * another relevant symptom.
 */
export function adaptAfterAnswer(
  state: AdaptiveState,
  question: AdaptiveQuestion,
  answer: string,
): AdaptiveState {
  const newConcepts = getAnswerDependentConcepts(
    question,
    answer,
  );

  const additionalQuestions =
    getQuestionsForConcepts(newConcepts);

  const knownIds = new Set(
    state.analysis.questions.map(
      (q) => q.id,
    ),
  );

  const mergedQuestions = [
    ...state.analysis.questions,
    ...additionalQuestions.filter(
      (q) => !knownIds.has(q.id),
    ),
  ];

  return {
    analysis: {
      ...state.analysis,
      concepts: [
        ...new Set([
          ...state.analysis.concepts,
          ...newConcepts,
        ]),
      ],
      questions: mergedQuestions,
    },
    answeredQuestionIds:
      state.answeredQuestionIds.includes(question.id)
        ? state.answeredQuestionIds
        : [
            ...state.answeredQuestionIds,
            question.id,
          ],
    answers: {
      ...state.answers,
      [question.id]: answer,
    },
  };
}

export type { AdaptiveQuestion } from "./adaptiveQuestionBank";