import { describe, expect, it } from "vitest";
import { QuestionEngine } from "./QuestionEngine";
import { petTestFlow } from "./testFlows/petTestFlow";

/** Fresh engine + walks past name/age so branching tests start at hasPet. */
function engineAtPetQuestion() {
  const engine = new QuestionEngine(petTestFlow);
  engine.answerAndAdvance("Asha");
  engine.answerAndAdvance(29);
  return engine;
}

describe("getCurrentQuestion", () => {
  it("starts at the flow's first question", () => {
    const engine = new QuestionEngine(petTestFlow);
    expect(engine.getCurrentQuestion()?.id).toBe("name");
  });

  it("returns null once the flow is complete", () => {
    const engine = engineAtPetQuestion();
    engine.answerAndAdvance("no");
    expect(engine.isComplete()).toBe(true);
    expect(engine.getCurrentQuestion()).toBeNull();
  });
});

describe("submitAnswer + goToNext", () => {
  it("moves to the next question in sequence", () => {
    const engine = new QuestionEngine(petTestFlow);
    expect(engine.submitAnswer("Asha")).toEqual({ ok: true });
    expect(engine.goToNext()).toEqual({ ok: true });
    expect(engine.getCurrentQuestion()?.id).toBe("age");
  });

  it("rejects invalid answers and does not advance", () => {
    const engine = new QuestionEngine(petTestFlow);
    engine.answerAndAdvance("Asha");

    const result = engine.submitAnswer("not a number" as unknown as number);
    expect(result.ok).toBe(false);
    expect(engine.getCurrentQuestion()?.id).toBe("age");
  });

  it("rejects required-but-empty answers", () => {
    const engine = new QuestionEngine(petTestFlow);
    const result = engine.submitAnswer("");
    expect(result.ok).toBe(false);
    expect(engine.getCurrentQuestion()?.id).toBe("name");
  });

  it("rejects an out-of-range single_select value", () => {
    const engine = engineAtPetQuestion();
    const result = engine.submitAnswer("maybe");
    expect(result.ok).toBe(false);
    expect(engine.getCurrentQuestion()?.id).toBe("hasPet");
  });

  it("refuses to advance past a required question with no answer", () => {
    const engine = new QuestionEngine(petTestFlow);
    const result = engine.goToNext();
    expect(result.ok).toBe(false);
    expect(engine.getCurrentQuestion()?.id).toBe("name");
  });
});

describe("conditional branching + skipping", () => {
  it("routes to petType when hasPet = yes", () => {
    const engine = engineAtPetQuestion();
    engine.answerAndAdvance("yes");
    expect(engine.getCurrentQuestion()?.id).toBe("petType");
  });

  it("skips petType entirely when hasPet = no", () => {
    const engine = engineAtPetQuestion();
    engine.answerAndAdvance("no");
    expect(engine.getCurrentQuestion()).toBeNull();
    expect(engine.isComplete()).toBe(true);
    expect(engine.getState().completedFields).not.toContain("petType");
  });
});

describe("goBack", () => {
  it("returns to the previous question, keeping its earlier answer visible", () => {
    const engine = engineAtPetQuestion();
    engine.answerAndAdvance("yes");
    expect(engine.getCurrentQuestion()?.id).toBe("petType");

    const back = engine.goBack();
    expect(back.ok).toBe(true);
    expect(engine.getCurrentQuestion()?.id).toBe("hasPet");
    expect(engine.getState().answers.hasPet).toBe("yes");
  });

  it("fails gracefully when there is no history", () => {
    const engine = new QuestionEngine(petTestFlow);
    const result = engine.goBack();
    expect(result.ok).toBe(false);
    expect(engine.getCurrentQuestion()?.id).toBe("name");
  });

  it("marks the flow incomplete again after going back from the end", () => {
    const engine = engineAtPetQuestion();
    engine.answerAndAdvance("no");
    expect(engine.isComplete()).toBe(true);

    engine.goBack();
    expect(engine.isComplete()).toBe(false);
    expect(engine.getCurrentQuestion()?.id).toBe("hasPet");
  });
});

describe("changeAnswer", () => {
  it("updates an already-answered field", () => {
    const engine = new QuestionEngine(petTestFlow);
    engine.answerAndAdvance("Asha");
    const result = engine.changeAnswer("name", "Rohan");
    expect(result.ok).toBe(true);
    expect(engine.getState().answers.name).toBe("Rohan");
  });

  it("re-derives downstream flow when an earlier branching answer changes", () => {
    const engine = engineAtPetQuestion();
    engine.answerAndAdvance("yes"); // now on petType
    engine.answerAndAdvance("dog"); // flow complete

    // Go back and change hasPet from yes -> no; petType's answer should be
    // discarded since that question is no longer reachable.
    const change = engine.changeAnswer("hasPet", "no");
    expect(change.ok).toBe(true);
    expect(engine.getCurrentQuestion()?.id).toBe("hasPet");
    expect(engine.getState().answers.petType).toBeUndefined();
    expect(engine.getState().completedFields).not.toContain("petType");
    expect(engine.isComplete()).toBe(false);
  });

  it("rejects changing a field that was never asked/answered", () => {
    const engine = new QuestionEngine(petTestFlow);
    const result = engine.changeAnswer("petType", "cat");
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid replacement value", () => {
    const engine = new QuestionEngine(petTestFlow);
    engine.answerAndAdvance("Asha");
    engine.answerAndAdvance(29);
    const result = engine.changeAnswer("age", "not a number" as unknown as number);
    expect(result.ok).toBe(false);
    expect(engine.getState().answers.age).toBe(29);
  });
});

describe("isComplete", () => {
  it("is false at the start and true once the flow ends", () => {
    const engine = new QuestionEngine(petTestFlow);
    expect(engine.isComplete()).toBe(false);

    engine.answerAndAdvance("Asha");
    engine.answerAndAdvance(29);
    engine.answerAndAdvance("no");

    expect(engine.isComplete()).toBe(true);
  });
});

describe("getProgress", () => {
  it("is 0 at the very start", () => {
    const engine = new QuestionEngine(petTestFlow);
    expect(engine.getProgress()).toBe(0);
  });

  it("increases monotonically as questions are answered", () => {
    const engine = new QuestionEngine(petTestFlow);
    const progressReadings: number[] = [engine.getProgress()];

    engine.answerAndAdvance("Asha");
    progressReadings.push(engine.getProgress());

    engine.answerAndAdvance(29);
    progressReadings.push(engine.getProgress());

    engine.answerAndAdvance("no");
    progressReadings.push(engine.getProgress());

    for (let i = 1; i < progressReadings.length; i++) {
      expect(progressReadings[i]).toBeGreaterThanOrEqual(progressReadings[i - 1]);
    }
  });

  it("is 1 once the flow is complete", () => {
    const engine = new QuestionEngine(petTestFlow);
    engine.answerAndAdvance("Asha");
    engine.answerAndAdvance(29);
    engine.answerAndAdvance("no");
    expect(engine.getProgress()).toBe(1);
  });
});

describe("invalid answers", () => {
  it("rejects a non-string value for a text question", () => {
    const engine = new QuestionEngine(petTestFlow);
    const result = engine.submitAnswer(12345 as unknown as string);
    expect(result.ok).toBe(false);
  });

  it("rejects NaN for a number question", () => {
    const engine = new QuestionEngine(petTestFlow);
    engine.answerAndAdvance("Asha");
    const result = engine.submitAnswer(Number("not-a-number"));
    expect(result.ok).toBe(false);
  });

  it("allows an optional question to be skipped with no answer", () => {
    // petType is required in the fixture flow, so build an ad-hoc optional
    // variant inline to prove optional-empty is accepted.
    const engine = new QuestionEngine({
      ...petTestFlow,
      questions: {
        ...petTestFlow.questions,
        name: { ...petTestFlow.questions.name, required: false },
      },
    });
    expect(engine.submitAnswer(null)).toEqual({ ok: true });
    expect(engine.goToNext()).toEqual({ ok: true });
    expect(engine.getCurrentQuestion()?.id).toBe("age");
  });
});
