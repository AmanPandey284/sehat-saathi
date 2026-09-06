/**
 * Question Engine — shared types (Milestone 4A foundation).
 *
 * This module defines a reusable, data-driven question schema. It has no
 * dependency on React, routing, or any specific clinical flow. Concrete
 * flows (abdominalPainFlow, feverFlow, coughFlow, ...) are built later by
 * authoring `QuestionFlow` objects using these types — none of that
 * clinical content is defined here.
 */

/** Supported answer input types a question can ask for. */
export type AnswerType =
  | "text"
  | "number"
  | "boolean"
  | "single_select"
  | "multi_select"
  | "date";

/** A selectable option for single_select / multi_select questions. */
export interface QuestionOption {
  /** Stable machine value stored in the answer state (e.g. "yes"). */
  value: string;
  /** English label shown to the patient. */
  labelEn: string;
  /** Hindi label shown to the patient. */
  labelHi: string;
}

/** The value shape an answer can take, depending on the question's answerType. */
export type AnswerValue = string | number | boolean | string[] | null;

/**
 * A single conditional branch: "if `field` currently equals `equals`,
 * go to `nextQuestionId` instead of the question's default next question."
 * Branches on a question are evaluated in order; the first match wins.
 */
export interface ConditionalBranch {
  /** Field name whose recorded answer is being checked. */
  field: string;
  /** Value that triggers this branch. Compared with strict/deep equality. */
  equals: AnswerValue;
  /** Question to go to when this branch matches. `null` ends the flow. */
  nextQuestionId: string | null;
}

/** One question definition in a flow. */
export interface QuestionDefinition {
  /** Unique ID of this question within its flow. */
  id: string;
  /** Field name the answer is stored under in the patient answer state. */
  field: string;
  /** Question text in English. */
  questionEn: string;
  /** Question text in Hindi. */
  questionHi: string;
  /** What kind of answer this question expects. */
  answerType: AnswerType;
  /** Options for single_select / multi_select. Ignored otherwise. */
  options?: QuestionOption[];
  /** Whether an answer must be provided before advancing. */
  required: boolean;
  /**
   * Default next question when no conditional branch matches (or none are
   * defined). `null` means this question can end the flow.
   */
  nextQuestionId: string | null;
  /**
   * Optional conditional branches, evaluated before falling back to
   * `nextQuestionId`. Enables things like "only ask Q4 if pet = yes".
   */
  branches?: ConditionalBranch[];
}

/** A complete, self-contained question flow. */
export interface QuestionFlow {
  /** Unique flow ID, e.g. "fever_flow" or "engine_test_flow". */
  id: string;
  /** Human-readable name, for logs/debugging. */
  name: string;
  /** ID of the first question to ask. */
  firstQuestionId: string;
  /** All questions in the flow, keyed by their `id`. */
  questions: Record<string, QuestionDefinition>;
}

/**
 * The patient's progress and answers through a flow. This is the engine's
 * persisted state — plain, serializable data with no methods, so it can be
 * stored in React state, memory, or (later) a real store without change.
 */
export interface PatientAnswerState {
  /** Which complaint/flow this state belongs to (e.g. "fever"). */
  complaint: string | null;
  /** Answers collected so far, keyed by field name (not question ID). */
  answers: Record<string, AnswerValue>;
  /** ID of the question currently being asked. `null` once the flow ends. */
  currentQuestionId: string | null;
  /** Ordered stack of previously-answered question IDs, for "go back". */
  history: string[];
  /** Field names that have a recorded answer. */
  completedFields: string[];
  /** True once the flow has reached its end. */
  isComplete: boolean;
}

/** Result of validating/submitting an answer. */
export interface SubmitResult {
  ok: boolean;
  /** Present when `ok` is false, explaining why the answer was rejected. */
  error?: string;
}

/** Result of attempting to move the flow forward. */
export interface AdvanceResult {
  ok: boolean;
  error?: string;
}
