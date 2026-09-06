import { describe, expect, it } from "vitest";
import {
  classifyFreeText,
  classifyFromQuickButton,
} from "./complaintClassifier";

describe("classifyFreeText — abdominal pain", () => {
  it.each([
    "stomach pain",
    "I have had stomach pain for three days.",
    "belly ache",
    "pet mein dard",
    "tummy ache",
  ])("recognizes %s", (input) => {
    const result = classifyFreeText(input);
    expect(result.complaintId).toBe("abdominal_pain");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.matchedKeywords.length).toBeGreaterThan(0);
  });
});

describe("classifyFreeText — fever", () => {
  it.each(["fever", "bukhar", "high temperature", "I think I have a fever"])(
    "recognizes %s",
    (input) => {
      const result = classifyFreeText(input);
      expect(result.complaintId).toBe("fever");
      expect(result.confidence).toBeGreaterThan(0);
    }
  );
});

describe("classifyFreeText — cough", () => {
  it.each(["cough", "khansi", "coughing", "I've been coughing all night"])(
    "recognizes %s",
    (input) => {
      const result = classifyFreeText(input);
      expect(result.complaintId).toBe("cough");
      expect(result.confidence).toBeGreaterThan(0);
    }
  );
});

describe("classifyFreeText — unknown complaints", () => {
  it.each(["my eyes hurt", "back pain", "I can't sleep well"])(
    "does not guess for %s",
    (input) => {
      const result = classifyFreeText(input);
      expect(result.complaintId).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.matchedKeywords).toHaveLength(0);
    }
  );
});

describe("classifyFreeText — confidence scaling", () => {
  it("gives higher confidence when more than one keyword matches", () => {
    const single = classifyFreeText("stomach pain");
    const double = classifyFreeText("coughing, I have a cough");
    expect(double.confidence).toBeGreaterThan(single.confidence);
  });
});

describe("classifyFromQuickButton", () => {
  it("always returns full confidence with no ambiguity", () => {
    const result = classifyFromQuickButton("fever");
    expect(result).toMatchObject({
      complaintId: "fever",
      displayName: "Fever",
      confidence: 1,
      source: "quick_button",
    });
  });
});
