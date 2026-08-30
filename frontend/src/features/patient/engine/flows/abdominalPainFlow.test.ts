import { describe, expect, it } from "vitest";
import { QuestionEngine } from "../QuestionEngine";
import { abdominalPainFlow } from "./abdominalPainFlow";

/** Answers Q1–Q4 (onset, location, onsetPattern, severity) so tests can
 * start from Q5 (painPattern) without repeating this every time. */
function engineAtPainPattern(): QuestionEngine {
  const engine = new QuestionEngine(abdominalPainFlow);
  engine.answerAndAdvance("Yesterday evening");
  engine.answerAndAdvance("Lower right abdomen");
  engine.answerAndAdvance("sudden");
  engine.answerAndAdvance(7);
  expect(engine.getCurrentQuestion()?.id).toBe("painPattern");
  return engine;
}

/** Walks a fully-answered "boring" path all the way to urinarySymptoms,
 * choosing constant / no vomiting / no fever / no bowel change, so tests
 * for the urinary branch don't need to restate the whole flow. */
function engineAtUrinarySymptoms(): QuestionEngine {
  const engine = engineAtPainPattern();
  engine.answerAndAdvance("constant"); // -> painQuality (episodeDuration skipped)
  engine.answerAndAdvance("dull_aching"); // -> aggravatingRelieving
  engine.answerAndAdvance("Rest helps"); // -> vomiting
  engine.answerAndAdvance("no"); // -> fever
  engine.answerAndAdvance("no"); // -> bowelChange
  engine.answerAndAdvance("no_change"); // -> urinarySymptoms
  expect(engine.getCurrentQuestion()?.id).toBe("urinarySymptoms");
  return engine;
}

describe("abdominal pain flow — basic shape", () => {
  it("starts at the onset question", () => {
    const engine = new QuestionEngine(abdominalPainFlow);
    expect(engine.getCurrentQuestion()?.id).toBe("onset");
  });

  it("every question has both English and Hindi text", () => {
    for (const question of Object.values(abdominalPainFlow.questions)) {
      expect(question.questionEn.trim().length).toBeGreaterThan(0);
      expect(question.questionHi.trim().length).toBeGreaterThan(0);
    }
  });

  it("every option (where present) has English and Hindi labels", () => {
    for (const question of Object.values(abdominalPainFlow.questions)) {
      for (const option of question.options ?? []) {
        expect(option.labelEn.trim().length).toBeGreaterThan(0);
        expect(option.labelHi.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe("intermittent vs constant pain — episode duration branching", () => {
  it("asks episode duration when the pain is intermittent", () => {
    const engine = engineAtPainPattern();
    engine.answerAndAdvance("intermittent");
    expect(engine.getCurrentQuestion()?.id).toBe("episodeDuration");

    engine.answerAndAdvance("About 20 minutes");
    expect(engine.getCurrentQuestion()?.id).toBe("painQuality");
  });

  it("skips episode duration when the pain is constant", () => {
    const engine = engineAtPainPattern();
    engine.answerAndAdvance("constant");
    expect(engine.getCurrentQuestion()?.id).toBe("painQuality");
    expect(engine.getState().completedFields).not.toContain("episodeDuration");
  });
});

describe("vomiting branching", () => {
  function engineAtVomiting(): QuestionEngine {
    const engine = engineAtPainPattern();
    engine.answerAndAdvance("constant");
    engine.answerAndAdvance("cramping");
    engine.answerAndAdvance("Nothing helps");
    expect(engine.getCurrentQuestion()?.id).toBe("vomiting");
    return engine;
  }

  it("asks vomit count and fluid-retention follow-ups when vomiting = yes", () => {
    const engine = engineAtVomiting();
    engine.answerAndAdvance("yes");
    expect(engine.getCurrentQuestion()?.id).toBe("vomitCount");

    engine.answerAndAdvance(3);
    expect(engine.getCurrentQuestion()?.id).toBe("keepingFluidsDown");

    engine.answerAndAdvance("no");
    expect(engine.getCurrentQuestion()?.id).toBe("fever");
  });

  it("skips vomiting follow-ups when vomiting = no", () => {
    const engine = engineAtVomiting();
    engine.answerAndAdvance("no");
    expect(engine.getCurrentQuestion()?.id).toBe("fever");
    expect(engine.getState().completedFields).not.toContain("vomitCount");
    expect(engine.getState().completedFields).not.toContain("keepingFluidsDown");
  });

  it("skips vomiting follow-ups when vomiting = not_sure", () => {
    const engine = engineAtVomiting();
    engine.answerAndAdvance("not_sure");
    expect(engine.getCurrentQuestion()?.id).toBe("fever");
  });
});

describe("fever branching", () => {
  function engineAtFever(): QuestionEngine {
    const engine = engineAtPainPattern();
    engine.answerAndAdvance("constant");
    engine.answerAndAdvance("burning");
    engine.answerAndAdvance("");
    engine.answerAndAdvance("no");
    expect(engine.getCurrentQuestion()?.id).toBe("fever");
    return engine;
  }

  it("asks temperature when fever = yes", () => {
    const engine = engineAtFever();
    engine.answerAndAdvance("yes");
    expect(engine.getCurrentQuestion()?.id).toBe("temperature");

    engine.answerAndAdvance("101 F");
    expect(engine.getCurrentQuestion()?.id).toBe("bowelChange");
  });

  it("skips temperature when fever = no", () => {
    const engine = engineAtFever();
    engine.answerAndAdvance("no");
    expect(engine.getCurrentQuestion()?.id).toBe("bowelChange");
    expect(engine.getState().completedFields).not.toContain("temperature");
  });
});

describe("bowel change branching", () => {
  function engineAtBowelChange(): QuestionEngine {
    const engine = engineAtPainPattern();
    engine.answerAndAdvance("constant");
    engine.answerAndAdvance("pressure_heaviness");
    engine.answerAndAdvance("");
    engine.answerAndAdvance("no");
    engine.answerAndAdvance("no");
    expect(engine.getCurrentQuestion()?.id).toBe("bowelChange");
    return engine;
  }

  it("asks frequency when bowelChange = diarrhoea", () => {
    const engine = engineAtBowelChange();
    engine.answerAndAdvance("diarrhoea");
    expect(engine.getCurrentQuestion()?.id).toBe("diarrhoeaFrequency");

    engine.answerAndAdvance("4 times a day");
    expect(engine.getCurrentQuestion()?.id).toBe("urinarySymptoms");
  });

  it("asks last bowel movement timing when bowelChange = constipation", () => {
    const engine = engineAtBowelChange();
    engine.answerAndAdvance("constipation");
    expect(engine.getCurrentQuestion()?.id).toBe("constipationLastBowelMovement");

    engine.answerAndAdvance("3 days ago");
    expect(engine.getCurrentQuestion()?.id).toBe("urinarySymptoms");
  });

  it("skips both follow-ups for no_change", () => {
    const engine = engineAtBowelChange();
    engine.answerAndAdvance("no_change");
    expect(engine.getCurrentQuestion()?.id).toBe("urinarySymptoms");
  });

  it("skips both follow-ups for blood_in_stool", () => {
    const engine = engineAtBowelChange();
    engine.answerAndAdvance("blood_in_stool");
    expect(engine.getCurrentQuestion()?.id).toBe("urinarySymptoms");
  });
});

describe("urinary symptoms branching", () => {
  it("asks symptom type when urinarySymptoms = yes", () => {
    const engine = engineAtUrinarySymptoms();
    engine.answerAndAdvance("yes");
    expect(engine.getCurrentQuestion()?.id).toBe("urinarySymptomType");

    engine.answerAndAdvance("burning");
    expect(engine.getCurrentQuestion()?.id).toBe("additionalNotes");
  });

  it("skips symptom type when urinarySymptoms = no and reaches the final question", () => {
    const engine = engineAtUrinarySymptoms();
    engine.answerAndAdvance("no");
    expect(engine.getCurrentQuestion()?.id).toBe("additionalNotes");

    engine.answerAndAdvance("Nothing else");
    expect(engine.isComplete()).toBe(true);
    expect(engine.getCurrentQuestion()).toBeNull();
  });
});

describe("back navigation", () => {
  it("returns to the previous question and keeps its answer", () => {
    const engine = engineAtPainPattern();
    engine.answerAndAdvance("intermittent");
    expect(engine.getCurrentQuestion()?.id).toBe("episodeDuration");

    const back = engine.goBack();
    expect(back.ok).toBe(true);
    expect(engine.getCurrentQuestion()?.id).toBe("painPattern");
    expect(engine.getState().answers.painPattern).toBe("intermittent");
  });

  it("can walk back across a skipped branch and re-enter it differently", () => {
    const engine = engineAtPainPattern();
    engine.answerAndAdvance("constant"); // skips episodeDuration -> painQuality
    expect(engine.getCurrentQuestion()?.id).toBe("painQuality");

    engine.goBack(); // -> back to painPattern
    expect(engine.getCurrentQuestion()?.id).toBe("painPattern");

    engine.answerAndAdvance("intermittent"); // now takes the other branch
    expect(engine.getCurrentQuestion()?.id).toBe("episodeDuration");
  });
});

describe("changing an earlier answer recalculates the path", () => {
  it("dropping vomiting from yes to no discards the vomiting follow-ups", () => {
    const engine = engineAtPainPattern();
    engine.answerAndAdvance("constant");
    engine.answerAndAdvance("sharp");
    engine.answerAndAdvance("");
    engine.answerAndAdvance("yes"); // vomiting = yes
    engine.answerAndAdvance(2); // vomitCount
    engine.answerAndAdvance("no"); // keepingFluidsDown -> now at fever
    expect(engine.getCurrentQuestion()?.id).toBe("fever");

    const change = engine.changeAnswer("vomiting", "no");
    expect(change.ok).toBe(true);
    expect(engine.getCurrentQuestion()?.id).toBe("vomiting");
    expect(engine.getState().answers.vomitCount).toBeUndefined();
    expect(engine.getState().answers.keepingFluidsDown).toBeUndefined();
    expect(engine.getState().completedFields).not.toContain("vomitCount");

    // Re-walking forward now skips the follow-ups entirely.
    engine.answerAndAdvance("no");
    expect(engine.getCurrentQuestion()?.id).toBe("fever");
  });

  it("switching bowelChange from diarrhoea to constipation swaps the follow-up question", () => {
    const engine = engineAtPainPattern();
    engine.answerAndAdvance("constant");
    engine.answerAndAdvance("sharp");
    engine.answerAndAdvance("");
    engine.answerAndAdvance("no");
    engine.answerAndAdvance("no");
    engine.answerAndAdvance("diarrhoea");
    engine.answerAndAdvance("Twice a day"); // -> urinarySymptoms
    expect(engine.getCurrentQuestion()?.id).toBe("urinarySymptoms");

    const change = engine.changeAnswer("bowelChange", "constipation");
    expect(change.ok).toBe(true);
    expect(engine.getCurrentQuestion()?.id).toBe("bowelChange");
    expect(engine.getState().answers.diarrhoeaFrequency).toBeUndefined();

    engine.answerAndAdvance("constipation");
    expect(engine.getCurrentQuestion()?.id).toBe("constipationLastBowelMovement");
  });
});

describe("progress and completion across the full flow", () => {
  it("reaches isComplete = true and progress 1 after a full path", () => {
    const engine = new QuestionEngine(abdominalPainFlow);
    engine.answerAndAdvance("This morning");
    engine.answerAndAdvance("Upper abdomen");
    engine.answerAndAdvance("gradual");
    engine.answerAndAdvance(5);
    engine.answerAndAdvance("intermittent");
    engine.answerAndAdvance("10 minutes");
    engine.answerAndAdvance("cramping");
    engine.answerAndAdvance("Eating makes it worse");
    engine.answerAndAdvance("yes");
    engine.answerAndAdvance(1);
    engine.answerAndAdvance("yes");
    engine.answerAndAdvance("yes");
    engine.answerAndAdvance("100.4 F");
    engine.answerAndAdvance("diarrhoea");
    engine.answerAndAdvance("3 times");
    engine.answerAndAdvance("yes");
    engine.answerAndAdvance("burning");
    engine.answerAndAdvance("Nothing more");

    expect(engine.isComplete()).toBe(true);
    expect(engine.getProgress()).toBe(1);
  });
});
