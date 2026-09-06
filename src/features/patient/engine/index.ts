/**
 * Public surface of the Question Engine.
 *
 * UI code (and future flows) should import from here rather than reaching
 * into `questionEngineCore.ts` directly, so the internal split between the
 * pure core and the stateful wrapper can change without breaking callers.
 *
 * Note: `testFlows/petTestFlow` is deliberately NOT re-exported here — it's
 * a test-only fixture, not part of the public engine surface.
 */

export type {
  AdvanceResult,
  AnswerType,
  AnswerValue,
  ConditionalBranch,
  PatientAnswerState,
  QuestionDefinition,
  QuestionFlow,
  QuestionOption,
  SubmitResult,
} from "./types";

export { QuestionEngine } from "./QuestionEngine";

export { abdominalPainFlow } from "./flows/abdominalPainFlow";

export {
  calculateProgress,
  changeAnswer,
  createInitialState,
  getCurrentQuestion,
  goBack,
  goToNext,
  isFlowComplete,
  resolveNextQuestionId,
  submitAnswer,
  validateAnswer,
} from "./questionEngineCore";
