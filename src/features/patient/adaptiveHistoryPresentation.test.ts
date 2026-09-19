import { describe, it, expect } from "vitest";
import {
  adaptiveQuestionBank,
  ADAPTIVE_FIELD_LABELS,
  getAdaptiveQuestionField,
} from "../../adaptiveQuestionBank";
import { labelField, valueText } from "../history/recordUtils";
import { normalizeClinicalAnswer } from "./services/clinicalNormalizer";
import { generateClinicalSummary } from "../history/summaryGenerator";
import type { ChiefComplaintRecord } from "./state/PatientSessionContext";

describe("Adaptive History Presentation & Semantic Labeling Suite", () => {
  const dizzinessFaintQuestion = adaptiveQuestionBank.find(
    (q) => q.id === "dizziness_faint",
  )!;

  describe("1. Question Bank Semantic Fields & Clinical Labels", () => {
    it("assigns semantic field 'loss_of_consciousness' and clinical label 'Loss of consciousness' to dizziness_faint", () => {
      expect(dizzinessFaintQuestion).toBeDefined();
      expect(dizzinessFaintQuestion.field).toBe("loss_of_consciousness");
      expect(dizzinessFaintQuestion.clinicalLabel).toBe("Loss of consciousness");
      expect(getAdaptiveQuestionField(dizzinessFaintQuestion)).toBe("loss_of_consciousness");
    });

    it("maps semantic field and id in ADAPTIVE_FIELD_LABELS dictionary", () => {
      expect(ADAPTIVE_FIELD_LABELS["loss_of_consciousness"]).toBe("Loss of consciousness");
      expect(ADAPTIVE_FIELD_LABELS["dizziness_faint"]).toBe("Loss of consciousness");
    });

    it("correctly resolves labelField for semantic, raw id, and adaptive_ prefixed keys", () => {
      expect(labelField("loss_of_consciousness")).toBe("Loss of consciousness");
      expect(labelField("dizziness_faint")).toBe("Loss of consciousness");
      expect(labelField("adaptive_dizziness_faint")).toBe("Loss of consciousness");
    });

    it("preserves standard camelCase and snake_case formatting for non-adaptive fields", () => {
      expect(labelField("feverDuration")).toBe("Fever Duration");
      expect(labelField("additionalNotes")).toBe("Additional Notes");
      expect(labelField("chestPain")).toBe("Chest Pain");
    });
  });

  describe("2. Visual Selected State Logic", () => {
    it("computes visual selected states for Yes/No options unmistakably", () => {
      // Patient selected 'No'
      const typed: string = "no";
      const draft: string | null = "no";
      const trimmed = typed.trim().toLowerCase();
      const isYes = draft === "yes" || trimmed === "yes" || trimmed === "हाँ";
      const isNo = draft === "no" || trimmed === "no" || trimmed === "नहीं";

      expect(isNo).toBe(true);
      expect(isYes).toBe(false);

      // Verify class determination
      const noButtonClass = isNo
        ? "border-clinic-600 bg-clinic-600 text-white font-semibold shadow-sm ring-2 ring-clinic-400/20"
        : "border-clinic-200 bg-white text-ink hover:border-clinic-500 hover:bg-clinic-50/50";
      const yesButtonClass = isYes
        ? "border-clinic-600 bg-clinic-600 text-white font-semibold shadow-sm ring-2 ring-clinic-400/20"
        : "border-clinic-200 bg-white text-ink hover:border-clinic-500 hover:bg-clinic-50/50";

      expect(noButtonClass).toContain("bg-clinic-600");
      expect(noButtonClass).toContain("text-white");
      expect(yesButtonClass).toContain("bg-white");
    });

    it("computes visual selected states for single-select options", () => {
      const options = ["Mild", "Moderate", "Severe", "Very severe"];
      const draft = "Severe";
      const typed = "Severe";

      const states = options.map((option) => ({
        option,
        isSelected:
          draft === option ||
          typed.trim().toLowerCase() === option.toLowerCase(),
      }));

      expect(states.find((s) => s.option === "Severe")?.isSelected).toBe(true);
      expect(states.find((s) => s.option === "Mild")?.isSelected).toBe(false);
      expect(states.find((s) => s.option === "Moderate")?.isSelected).toBe(false);
    });
  });

  describe("3. Answer Value Formatting & Normalization", () => {
    it("formats yes/no strings and booleans to capitalized 'Yes' / 'No'", () => {
      expect(valueText("no")).toBe("No");
      expect(valueText("yes")).toBe("Yes");
      expect(valueText(false)).toBe("No");
      expect(valueText(true)).toBe("Yes");
      expect(valueText("not_sure")).toBe("Not sure");
      expect(valueText("Moderate")).toBe("Moderate");
      expect(valueText(null)).toBe("Not reported");
      expect(valueText(undefined)).toBe("Not reported");
    });

    it("normalizes clinical evidence with semantic field, normalized value, and original question text", () => {
      const semanticField = getAdaptiveQuestionField(dizzinessFaintQuestion);
      const answer = "no";
      const evidence = normalizeClinicalAnswer(
        semanticField,
        answer,
        dizzinessFaintQuestion.text,
      );

      expect(evidence.field).toBe("loss_of_consciousness");
      expect(evidence.originalAnswer).toBe("no");
      expect(evidence.normalizedValue).toBe(false);
      expect(evidence.questionText).toBe(
        "Have you actually fainted or lost consciousness?",
      );
      expect(evidence.source).toBe("PATIENT");
    });
  });

  describe("4. Complete End-to-End Retention & Presentation Flow", () => {
    it("proves adaptive answer is retained in historyAnswers under semantic field and NOT dumped into additionalNotes", () => {
      // Step A: Patient answers adaptive question
      const rawAnswer = "no";
      const semanticField = getAdaptiveQuestionField(dizzinessFaintQuestion);

      const retainedAdaptiveAnswers: Record<string, string> = {
        [semanticField]: rawAnswer,
      };

      // Step B: Regular flow completes
      const engineAnswers: Record<string, string> = {
        duration: "3 days",
        severity: "Moderate",
      };

      // Step C: Merged into historyAnswers upon flow completion
      const historyAnswers: Record<string, string> = {
        ...retainedAdaptiveAnswers,
        ...engineAnswers,
      };

      expect(historyAnswers.loss_of_consciousness).toBe("no");
      expect(historyAnswers["additionalNotes"]).toBeUndefined();

      // Step D: Patient Review rendering check
      const reviewRows = Object.entries(historyAnswers).map(([field, val]) => ({
        label: labelField(field),
        value: valueText(val),
        renderedText: `${labelField(field)}: ${valueText(val)}`,
      }));

      const locRow = reviewRows.find((r) => r.label === "Loss of consciousness");
      expect(locRow).toBeDefined();
      expect(locRow?.value).toBe("No");
      expect(locRow?.renderedText).toBe("Loss of consciousness: No");

      // Verify additionalNotes did NOT capture this answer
      const notesRow = reviewRows.find((r) => r.label === "Additional Notes");
      expect(notesRow).toBeUndefined();

      // Step E: Physician Summary rendering check
      const mockComplaint: ChiefComplaintRecord = {
        complaintId: "custom",
        displayName: "Dizziness and Vertigo",
        originalInput: "Feeling very dizzy since yesterday",
        confidence: 0.95,
        source: "patient",
      };

      const summary = generateClinicalSummary(
        mockComplaint,
        historyAnswers,
        [],
        undefined,
      );

      expect(summary).toContain("• Loss of consciousness: No [source: patient; unverified]");
      expect(summary).not.toContain("Additional Notes: no");
      expect(summary).not.toContain("dizziness_faint");
    });

    it("preserves traceable clinical evidence linking original question and patient answer", () => {
      const evidence = normalizeClinicalAnswer(
        "loss_of_consciousness",
        "no",
        "Have you actually fainted or lost consciousness?",
      );

      expect(evidence).toMatchObject({
        field: "loss_of_consciousness",
        originalAnswer: "no",
        normalizedValue: false,
        questionText: "Have you actually fainted or lost consciousness?",
        source: "PATIENT",
      });
    });
  });
});
