import { describe, expect, it } from "vitest";
import { normalizeSeverity } from "./severityNormalizer";

describe("normalizeSeverity — numeric values", () => {
  it.each([
    ["10", 10],
    ["0", 0],
    ["5", 5],
    ["7", 7],
    ["10/10", 10],
    ["8/10", 8],
    ["eight", 8],
  ])("normalizes %s to %d with high confidence", (input, expected) => {
    const result = normalizeSeverity(input);
    expect(result.normalizedSeverity).toBe(expected);
    expect(result.confidence).toBe("high");
    expect(result.originalAnswer).toBe(input);
  });
});

describe('normalizeSeverity — "8 out of 10" style phrasing', () => {
  it.each([
    ["8 out of 10", 8],
    ["10 out of 10", 10],
    ["0 out of 10", 0],
  ])("normalizes %s to %d with high confidence", (input, expected) => {
    const result = normalizeSeverity(input);
    expect(result.normalizedSeverity).toBe(expected);
    expect(result.confidence).toBe("high");
    expect(result.originalAnswer).toBe(input);
  });
});

describe("normalizeSeverity — English descriptions", () => {
  it.each([
    ["mild", 2],
    ["slight", 2],
    ["moderate", 5],
    ["medium", 5],
    ["severe", 8],
    ["intense", 8],
    ["very severe", 9],
    ["extreme", 9],
    ["unbearable", 9],
  ])("normalizes %s to %d with medium confidence", (input, expected) => {
    const result = normalizeSeverity(input);
    expect(result.normalizedSeverity).toBe(expected);
    expect(result.confidence).toBe("medium");
    expect(result.originalAnswer).toBe(input);
  });
});

describe("normalizeSeverity — Hindi / Hinglish descriptions", () => {
  it.each([
    ["halka dard", 2],
    ["हल्का दर्द", 2],
    ["thoda dard", 2],
    ["madhyam", 5],
    ["मध्यम", 5],
    ["bahut dard", 8],
    ["बहुत दर्द", 8],
    ["bahut tez", 9],
    ["बहुत तेज़", 9],
  ])("normalizes %s to %d with medium confidence", (input, expected) => {
    const result = normalizeSeverity(input);
    expect(result.normalizedSeverity).toBe(expected);
    expect(result.confidence).toBe("medium");
    expect(result.originalAnswer).toBe(input);
  });
});

describe("normalizeSeverity — invalid numbers", () => {
  it.each(["15", "-2", "11/10", "20 out of 10", "100"])(
    "does not invent a value for out-of-range %s",
    (input) => {
      const result = normalizeSeverity(input);
      expect(result.normalizedSeverity).toBeNull();
      expect(result.confidence).toBe("low");
      expect(result.originalAnswer).toBe(input);
    }
  );
});

describe("normalizeSeverity — ambiguous answers", () => {
  it.each(["", "   ", "kind of hurts", "it varies", "dard hai", "not sure", "a lot"])(
    "does not guess for %s",
    (input) => {
      const result = normalizeSeverity(input);
      expect(result.normalizedSeverity).toBeNull();
      expect(result.confidence).toBe("low");
      expect(result.originalAnswer).toBe(input);
    }
  );
});

describe("normalizeSeverity — provenance", () => {
  it("preserves the original answer text exactly, including casing and punctuation", () => {
    const input = "  Very Severe!  ";
    const result = normalizeSeverity(input);
    expect(result.originalAnswer).toBe(input);
    expect(result.normalizedSeverity).toBe(9);
  });
});
