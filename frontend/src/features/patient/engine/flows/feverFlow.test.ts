import { describe, expect, it } from "vitest";
import { QuestionEngine } from "../QuestionEngine";
import { feverFlow } from "./feverFlow";

describe("fever flow — basic shape", () => {
  it("starts at the duration question", () => {
    const engine = new QuestionEngine(feverFlow);
    expect(engine.getCurrentQuestion()?.id).toBe("duration");
  });

  it("every question has both English and Hindi text", () => {
    for (const question of Object.values(feverFlow.questions)) {
      expect(question.questionEn.trim().length).toBeGreaterThan(0);
      expect(question.questionHi.trim().length).toBeGreaterThan(0);
    }
  });

  it("every option (where present) has English and Hindi labels", () => {
    for (const question of Object.values(feverFlow.questions)) {
      for (const option of question.options ?? []) {
        expect(option.labelEn.trim().length).toBeGreaterThan(0);
        expect(option.labelHi.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("ends at additionalNotes with a null nextQuestionId", () => {
    expect(feverFlow.questions.additionalNotes.nextQuestionId).toBeNull();
  });
});

describe("known temperature branching", () => {
  it("asks for the temperature value when the patient knows it", () => {
    const engine = new QuestionEngine(feverFlow);
    engine.answerAndAdvance("3 days"); // -> knowsTemperature
    engine.answerAndAdvance("yes");
    expect(engine.getCurrentQuestion()?.id).toBe("temperature");
    engine.answerAndAdvance("102 F");
    expect(engine.getCurrentQuestion()?.id).toBe("feverPattern");
  });

  it("skips straight to fever pattern when the patient does not know it", () => {
    const engine = new QuestionEngine(feverFlow);
    engine.answerAndAdvance("3 days"); // -> knowsTemperature
    engine.answerAndAdvance("no");
    expect(engine.getCurrentQuestion()?.id).toBe("feverPattern");
  });
});

/** Walks the "boring" no-symptom path from feverPattern to rash, so
 * urinary-branch tests don't have to restate the whole flow. */
function engineAtRash(): QuestionEngine {
  const engine = new QuestionEngine(feverFlow);
  engine.answerAndAdvance("2 days"); // -> knowsTemperature
  engine.answerAndAdvance("no"); // -> feverPattern
  engine.answerAndAdvance("continuous"); // -> chills
  engine.answerAndAdvance("no"); // -> sweating
  engine.answerAndAdvance("no"); // -> cough
  engine.answerAndAdvance("no"); // -> soreThroat
  engine.answerAndAdvance("no"); // -> breathingDifficulty
  engine.answerAndAdvance("no"); // -> vomiting
  engine.answerAndAdvance("no"); // -> diarrhoea
  engine.answerAndAdvance("no"); // -> urinarySymptoms
  engine.answerAndAdvance("no"); // -> rash
  expect(engine.getCurrentQuestion()?.id).toBe("rash");
  return engine;
}

describe("urinary symptoms branching", () => {
  it("asks urinary symptom type when urinarySymptoms = yes", () => {
    const engine = new QuestionEngine(feverFlow);
    engine.answerAndAdvance("2 days");
    engine.answerAndAdvance("no");
    engine.answerAndAdvance("continuous");
    engine.answerAndAdvance("no");
    engine.answerAndAdvance("no");
    engine.answerAndAdvance("no");
    engine.answerAndAdvance("no");
    engine.answerAndAdvance("no");
    engine.answerAndAdvance("no");
    engine.answerAndAdvance("no");
    engine.answerAndAdvance("yes"); // urinarySymptoms
    expect(engine.getCurrentQuestion()?.id).toBe("urinarySymptomType");
    engine.answerAndAdvance("burning");
    expect(engine.getCurrentQuestion()?.id).toBe("rash");
    engine.answerAndAdvance("no");
    expect(engine.getCurrentQuestion()?.id).toBe("associatedSymptoms");
  });

  it("skips urinary symptom type when the answer is no", () => {
    const engine = engineAtRash();
    engine.answerAndAdvance("no"); // rash
    expect(engine.getCurrentQuestion()?.id).toBe("associatedSymptoms");
  });
});

describe("completing the flow", () => {
  it("reaches completion after answering associated symptoms and additional notes", () => {
    const engine = engineAtRash();
    engine.answerAndAdvance("no"); // rash
    expect(engine.getCurrentQuestion()?.id).toBe("associatedSymptoms");
    engine.answerAndAdvance(["none"]);
    expect(engine.getCurrentQuestion()?.id).toBe("additionalNotes");
    engine.answerAndAdvance("");
    expect(engine.isComplete()).toBe(true);
  });
});
