import { describe, expect, it } from "vitest";
import { QuestionEngine } from "../QuestionEngine";
import { coughFlow } from "./coughFlow";

describe("cough flow — basic shape", () => {
  it("starts at the duration question", () => {
    const engine = new QuestionEngine(coughFlow);
    expect(engine.getCurrentQuestion()?.id).toBe("duration");
  });

  it("every question has both English and Hindi text", () => {
    for (const question of Object.values(coughFlow.questions)) {
      expect(question.questionEn.trim().length).toBeGreaterThan(0);
      expect(question.questionHi.trim().length).toBeGreaterThan(0);
    }
  });

  it("every option (where present) has English and Hindi labels", () => {
    for (const question of Object.values(coughFlow.questions)) {
      for (const option of question.options ?? []) {
        expect(option.labelEn.trim().length).toBeGreaterThan(0);
        expect(option.labelHi.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("ends at additionalNotes with a null nextQuestionId", () => {
    expect(coughFlow.questions.additionalNotes.nextQuestionId).toBeNull();
  });
});

describe("dry vs productive branching", () => {
  it("asks phlegm colour when the cough is productive", () => {
    const engine = new QuestionEngine(coughFlow);
    engine.answerAndAdvance("5 days"); // -> coughType
    engine.answerAndAdvance("productive");
    expect(engine.getCurrentQuestion()?.id).toBe("phlegmColor");
    engine.answerAndAdvance("yellow_green");
    expect(engine.getCurrentQuestion()?.id).toBe("fever");
  });

  it("skips phlegm colour when the cough is dry", () => {
    const engine = new QuestionEngine(coughFlow);
    engine.answerAndAdvance("5 days"); // -> coughType
    engine.answerAndAdvance("dry");
    expect(engine.getCurrentQuestion()?.id).toBe("fever");
  });

  it("skips phlegm colour when not sure", () => {
    const engine = new QuestionEngine(coughFlow);
    engine.answerAndAdvance("5 days");
    engine.answerAndAdvance("not_sure");
    expect(engine.getCurrentQuestion()?.id).toBe("fever");
  });
});

/** Walks the dry, no-symptom path from fever to respiratoryHistory, so the
 * completion test doesn't need to restate every step. */
function engineAtRespiratoryHistory(): QuestionEngine {
  const engine = new QuestionEngine(coughFlow);
  engine.answerAndAdvance("5 days"); // -> coughType
  engine.answerAndAdvance("dry"); // -> fever
  engine.answerAndAdvance("no"); // -> breathlessness
  engine.answerAndAdvance("no"); // -> chestPain
  engine.answerAndAdvance("no"); // -> bloodInCough
  engine.answerAndAdvance("no"); // -> smokingExposure
  engine.answerAndAdvance("no"); // -> respiratoryHistory
  expect(engine.getCurrentQuestion()?.id).toBe("respiratoryHistory");
  return engine;
}

describe("completing the flow", () => {
  it("reaches completion after answering additionalNotes", () => {
    const engine = engineAtRespiratoryHistory();
    engine.answerAndAdvance("no"); // respiratoryHistory
    expect(engine.getCurrentQuestion()?.id).toBe("additionalNotes");
    engine.answerAndAdvance("");
    expect(engine.isComplete()).toBe(true);
  });
});
