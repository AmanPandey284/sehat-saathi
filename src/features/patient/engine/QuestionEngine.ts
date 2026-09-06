/**
 * Question Engine — stateful wrapper (Milestone 4A foundation).
 *
 * A thin convenience class around the pure functions in
 * `questionEngineCore.ts`. It holds one `PatientAnswerState` internally and
 * exposes the 8 operations required for adaptive questioning:
 *
 *   1. getCurrentQuestion()
 *   2. submitAnswer(value)
 *   3. goToNext()
 *   4. goBack()
 *   5. changeAnswer(field, value)
 *   6. (conditional skipping happens automatically inside goToNext)
 *   7. isComplete()
 *   8. getProgress()
 *
 * This class has no dependency on React, routing, or Tailwind — it can be
 * constructed and driven from a React hook, a test, or (later) a different
 * UI entirely. It does not know about abdominalPainFlow / feverFlow /
 * coughFlow; it just runs whatever `QuestionFlow` it's given.
 */

import type {
  AdvanceResult,
  AnswerValue,
  PatientAnswerState,
  QuestionDefinition,
  QuestionFlow,
  SubmitResult,
} from "./types";
import {
  calculateProgress,
  changeAnswer,
  correctAnswer,
  createInitialState,
  getCurrentQuestion,
  goBack,
  goToNext,
  isFlowComplete,
  submitAnswer,
} from "./questionEngineCore";

export class QuestionEngine {
  private flow: QuestionFlow;
  private state: PatientAnswerState;

  constructor(flow: QuestionFlow, complaint?: string | null) {
    this.flow = flow;
    this.state = createInitialState(flow, complaint ?? flow.id);
  }

  /** Returns a copy of the engine's current state (for persisting/inspecting). */
  getState(): PatientAnswerState {
    return { ...this.state, answers: { ...this.state.answers } };
  }

  /** Replaces the engine's state wholesale, e.g. when resuming a saved session. */
  loadState(state: PatientAnswerState): void {
    this.state = { ...state, answers: { ...state.answers } };
  }

  /** 1. Get the question currently being asked, or null if the flow ended. */
  getCurrentQuestion(): QuestionDefinition | null {
    return getCurrentQuestion(this.flow, this.state);
  }

  /** 2. Record an answer for the current question (does not advance). */
  submitAnswer(value: AnswerValue): SubmitResult {
    const { state, result } = submitAnswer(this.flow, this.state, value);
    this.state = state;
    return result;
  }

  /** 3. Move forward to the next reachable question (auto-skips branches). */
  goToNext(): AdvanceResult {
    const { state, result } = goToNext(this.flow, this.state);
    this.state = state;
    return result;
  }

  /** 4. Move back to the previously-answered question. */
  goBack(): AdvanceResult {
    const { state, result } = goBack(this.flow, this.state);
    this.state = state;
    return result;
  }

  /** 5. Change the answer to an already-answered question, by field name. */
  changeAnswer(field: string, value: AnswerValue): SubmitResult {
    const { state, result } = changeAnswer(this.flow, this.state, field, value);
    this.state = state;
    return result;
  }

  /** Correct an already-answered field without forcing the patient to replay later questions. */
  correctAnswer(field: string, value: AnswerValue): SubmitResult {
    const { state, result } = correctAnswer(this.flow, this.state, field, value);
    this.state = state;
    return result;
  }

  /** 7. Whether the flow has reached its end. */
  isComplete(): boolean {
    return isFlowComplete(this.state);
  }

  /** 8. Approximate progress through the flow, from 0 to 1. */
  getProgress(): number {
    return calculateProgress(this.flow, this.state);
  }

  /** Convenience: submit the current answer and immediately advance. */
  answerAndAdvance(value: AnswerValue): SubmitResult | AdvanceResult {
    const submitResult = this.submitAnswer(value);
    if (!submitResult.ok) return submitResult;
    return this.goToNext();
  }
}
