import { describe, expect, it } from "vitest";
import { normalizeDuration } from "./durationNormalizer";

describe("normalizeDuration — English", () => {
  it.each([
    ["3 days", 3],
    ["3 days.", 3],
    ["three days", 3],
    ["1 week", 7],
    ["2 weeks", 14],
    ["2 months", 60],
    ["since yesterday", 1],
    ["yesterday", 1],
  ])("normalizes %s to %d days", (input, expectedDays) => {
    const result = normalizeDuration(input);
    expect(result.normalizedDays).toBe(expectedDays);
    expect(result.confidence).toBe("high");
    expect(result.originalAnswer).toBe(input);
  });

  it('normalizes "about a week" to 7 days', () => {
    const result = normalizeDuration("about a week");
    expect(result.normalizedDays).toBe(7);
    expect(result.confidence).toBe("high");
  });
});

describe("normalizeDuration — Hindi (Devanagari)", () => {
  it.each([
    ["तीन दिन से", 3],
    ["एक हफ्ते से", 7],
    ["कल से", 1],
  ])("normalizes %s to %d days", (input, expectedDays) => {
    const result = normalizeDuration(input);
    expect(result.normalizedDays).toBe(expectedDays);
    expect(result.confidence).toBe("high");
    expect(result.originalAnswer).toBe(input);
  });
});

describe("normalizeDuration — Hinglish", () => {
  it.each([
    ["3 din se", 3],
    ["teen din se", 3],
    ["ek hafte se", 7],
    ["kal se", 1],
  ])("normalizes %s to %d days", (input, expectedDays) => {
    const result = normalizeDuration(input);
    expect(result.normalizedDays).toBe(expectedDays);
    expect(result.confidence).toBe("high");
    expect(result.originalAnswer).toBe(input);
  });
});

describe("normalizeDuration — ambiguous / unrecognized input", () => {
  it.each([
    "",
    "   ",
    "a while",
    "a long time",
    "not sure",
    "kaafi dino se",
    "off and on",
    "42",
  ])("does not guess for %s", (input) => {
    const result = normalizeDuration(input);
    expect(result.normalizedDays).toBeNull();
    expect(result.confidence).toBe("low");
    expect(result.originalAnswer).toBe(input);
  });
});

describe("normalizeDuration — provenance", () => {
  it("preserves the original answer text exactly, including casing and punctuation", () => {
    const input = "  THREE Days!  ";
    const result = normalizeDuration(input);
    expect(result.originalAnswer).toBe(input);
    expect(result.normalizedDays).toBe(3);
  });
});
