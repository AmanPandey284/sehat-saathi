import { describe, expect, it } from "vitest";
import { normalizeYesNoAnswer } from "./answerNormalizer";

describe("normalizeYesNoAnswer — yes", () => {
  it.each(["yes", "Yes", "yeah", "yep", "yup", "haan", "हाँ", "Yes, it does."])(
    "recognizes %s",
    (input) => {
      const result = normalizeYesNoAnswer(input);
      expect(result.normalized).toBe("yes");
      expect(result.originalAnswer).toBe(input);
    }
  );
});

describe("normalizeYesNoAnswer — no", () => {
  it.each(["no", "No", "nope", "nahi", "nahin", "नहीं", "No, not at all."])(
    "recognizes %s",
    (input) => {
      const result = normalizeYesNoAnswer(input);
      expect(result.normalized).toBe("no");
      expect(result.originalAnswer).toBe(input);
    }
  );
});

describe("normalizeYesNoAnswer — not_sure", () => {
  it.each(["not sure", "Not Sure", "maybe", "pata nahi", "पता नहीं", "I'm not sure honestly"])(
    "recognizes %s",
    (input) => {
      const result = normalizeYesNoAnswer(input);
      expect(result.normalized).toBe("not_sure");
      expect(result.originalAnswer).toBe(input);
    }
  );
});

describe("normalizeYesNoAnswer — unknown", () => {
  it.each(["", "   ", "banana", "kal aana", "sometimes", "42"])(
    "does not guess for %s",
    (input) => {
      const result = normalizeYesNoAnswer(input);
      expect(result.normalized).toBe("unknown");
    }
  );
});

describe("normalizeYesNoAnswer — word boundaries", () => {
  it("does not treat 'no' inside 'know' as a no answer", () => {
    const result = normalizeYesNoAnswer("I don't know");
    expect(result.normalized).toBe("unknown");
  });

  it("does not treat 'ok' inside 'broken' as a yes answer", () => {
    const result = normalizeYesNoAnswer("my leg is broken");
    expect(result.normalized).toBe("unknown");
  });
});

describe("normalizeYesNoAnswer — provenance", () => {
  it("preserves the original answer text exactly, including casing and punctuation", () => {
    const input = "  Yeah, definitely!  ";
    const result = normalizeYesNoAnswer(input);
    expect(result.originalAnswer).toBe(input);
  });
});
