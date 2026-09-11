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

// Six new body-system routing flows
export { eyeProblemsFlow }     from "./flows/eyeProblemsFlow";
export { headacheFlow }        from "./flows/headacheFlow";
export { backPainFlow }        from "./flows/backPainFlow";
export { skinProblemsFlow }    from "./flows/skinProblemsFlow";
export { jointPainFlow }       from "./flows/jointPainFlow";
export { urinaryProblemsFlow } from "./flows/urinaryProblemsFlow";

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
