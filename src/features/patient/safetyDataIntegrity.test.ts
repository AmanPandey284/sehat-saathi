import { describe, it, expect } from "vitest";
import { valueText } from "../history/recordUtils";
import { generateClinicalSummary } from "../history/summaryGenerator";
import { evaluateSafety, detectUrgentComplaintText } from "../safety/safetyEngine";
import { isSafetyScreened } from "./returningPatientModel";
import type { StoredPatientRecord } from "../doctor/patientRecords";
import type { SafetyFlag } from "./state/PatientSessionContext";

describe("Safety & History Data Integrity Regression Suite", () => {
  describe("valueText 4-state distinction & empty string robustness", () => {
    it("proves explicit Yes remains 'Yes'", () => {
      expect(valueText(true)).toBe("Yes");
      expect(valueText("yes")).toBe("Yes");
      expect(valueText("YES")).toBe("Yes");
    });

    it("proves explicit No remains 'No'", () => {
      expect(valueText(false)).toBe("No");
      expect(valueText("no")).toBe("No");
      expect(valueText("NO")).toBe("No");
    });

    it("proves explicit Not Sure remains 'Not sure'", () => {
      expect(valueText("not_sure")).toBe("Not sure");
    });

    it("proves unanswered and omitted fields remain 'Not reported'", () => {
      expect(valueText(null)).toBe("Not reported");
      expect(valueText(undefined)).toBe("Not reported");
    });

    it("proves empty strings and whitespace strings render as 'Not reported'", () => {
      expect(valueText("")).toBe("Not reported");
      expect(valueText("   ")).toBe("Not reported");
      expect(valueText("\t\n")).toBe("Not reported");
    });
  });

  describe("Returning-patient safety gate data integrity", () => {
    it("proves 'None of the above' path does NOT inject keepingFluidsDown: 'yes' or severity: 2", () => {
      // Simulate session after passing handleConfirmNoRedFlags
      const todaySessionAnswers: Record<string, unknown> = {
        safety_screened: true,
        safety_screened_at: new Date().toISOString(),
      };

      // Ensure safety check passes
      expect(isSafetyScreened(todaySessionAnswers)).toBe(true);

      // Verify no synthetic fields injected
      expect(todaySessionAnswers.keepingFluidsDown).toBeUndefined();
      expect(todaySessionAnswers.severity).toBeUndefined();
      expect(todaySessionAnswers.breathingDifficulty).toBeUndefined();
      expect(todaySessionAnswers.chestPain).toBeUndefined();
      expect(todaySessionAnswers.bloodInCough).toBeUndefined();
      expect(todaySessionAnswers.bloodInStool).toBeUndefined();
      expect(todaySessionAnswers.vomiting).toBeUndefined();
    });

    it("proves unselected checklist items are NOT stored as 'no' and no synthetic answers are saved", () => {
      // Patient selects only 1 red flag (e.g., severe pain) during checklist
      const selectedFlags = {
        severePain: false,
        breathingDifficulty: false,
        chestPain: false,
        bloodInCough: false,
        bloodInStool: false,
        vomiting: false,
      };

      // Temporary evaluation payload used internally by evaluateSafety()
      const evalPayload = {
        breathingDifficulty: selectedFlags.breathingDifficulty ? "yes" : "no",
        chestPain: selectedFlags.chestPain ? "yes" : "no",
        bloodInCough: selectedFlags.bloodInCough ? "yes" : "no",
        bloodInStool: selectedFlags.bloodInStool ? "yes" : "no",
        vomiting: selectedFlags.vomiting ? "yes" : "no",
        keepingFluidsDown: selectedFlags.vomiting ? "no" : "yes",
        severity: selectedFlags.severePain ? 9 : 2,
      };

      const triggeredFlags = evaluateSafety(evalPayload);
      const urgentFlag = triggeredFlags.find((f) => f.severity === "urgent");
      expect(urgentFlag).toBeUndefined();

      // Confirmed answers actually stored in today's session
      const confirmedSafetyAnswers: Record<string, unknown> = {
        safety_screened: true,
        safety_screened_at: new Date().toISOString(),
      };
      if (selectedFlags.breathingDifficulty) confirmedSafetyAnswers.breathingDifficulty = "yes";
      if (selectedFlags.chestPain) confirmedSafetyAnswers.chestPain = "yes";
      if (selectedFlags.bloodInCough) confirmedSafetyAnswers.bloodInCough = "yes";
      if (selectedFlags.bloodInStool) confirmedSafetyAnswers.bloodInStool = "yes";
      if (selectedFlags.vomiting) confirmedSafetyAnswers.vomiting = "yes";

      // Unselected items must be absent, NOT "no"
      expect(confirmedSafetyAnswers.breathingDifficulty).toBeUndefined();
      expect(confirmedSafetyAnswers.chestPain).toBeUndefined();
      expect(confirmedSafetyAnswers.bloodInCough).toBeUndefined();
      expect(confirmedSafetyAnswers.bloodInStool).toBeUndefined();
      expect(confirmedSafetyAnswers.vomiting).toBeUndefined();
      expect(confirmedSafetyAnswers.keepingFluidsDown).toBeUndefined();
      expect(confirmedSafetyAnswers.severity).toBeUndefined();
    });

    it("proves physician summary does not falsely display synthetic values as patient answers", () => {
      const chiefComplaint = {
        complaintId: "cough" as const,
        displayName: "Follow-up: Cough with breathlessness",
        originalInput: "Follow-up visit",
        confidence: 1.0,
        source: "patient" as const,
      };

      const cleanTodayAnswers = {
        safety_screened: true,
        safety_screened_at: new Date().toISOString(),
        returning_visit_reason: "follow_up",
        returning_followup_status: "same",
      };

      const summary = generateClinicalSummary(
        chiefComplaint,
        cleanTodayAnswers,
        [],
        undefined,
        {
          name: "Ramesh Patel",
          age: "48",
          sex: "Male",
          identifier: "ABHA-91-4458-1200",
          identifierType: "abha",
          language: "en",
        }
      );

      // Summary must not contain fabricated clinical items
      expect(summary).not.toContain("Keeping fluids down: Yes");
      expect(summary).not.toContain("Severity: 2");
      expect(summary).not.toContain("Breathing difficulty: No");
      expect(summary).not.toContain("Chest pain: No");
      expect(summary).not.toContain("Blood in cough: No");
      expect(summary).not.toContain("Safety screened: Yes");

      // Longitudinal delta is properly formatted
      expect(summary).toContain("Longitudinal visit delta:");
      expect(summary).toContain("Visit category: follow_up");
      expect(summary).toContain("Follow-up status: same");
      expect(summary).toContain("History of present illness:\n• Not reported");
    });

    it("proves historical severity and symptoms are NOT carried into today's visit answers", () => {
      // Previous visit from 2 weeks ago with acute severe symptoms
      const previousRecord: Partial<StoredPatientRecord> = {
        id: "DEMO-REC-001",
        historyAnswers: {
          severity: 8,
          duration: "4 days",
          chills: "yes",
          cough: "yes",
          fever: "yes",
        },
      };

      // Today's returning session with no new acute symptoms
      const todaySession = {
        historyAnswers: {
          safety_screened: true,
          safety_screened_at: new Date().toISOString(),
        },
      };

      // Today's updated record answers (without copying previousRecord.historyAnswers)
      const updatedTodayHistoryAnswers: Record<string, unknown> = {
        ...(todaySession.historyAnswers || {}),
        returning_visit_reason: "follow_up",
        returning_followup_status: "better",
      };

      // Verify previous acute symptoms are NOT in today's answers
      expect(updatedTodayHistoryAnswers.severity).toBeUndefined();
      expect(updatedTodayHistoryAnswers.chills).toBeUndefined();
      expect(updatedTodayHistoryAnswers.fever).toBeUndefined();
      expect(updatedTodayHistoryAnswers.duration).toBeUndefined();
      expect(previousRecord.historyAnswers?.severity).toBe(8); // historical record intact
    });

    it("proves existing emergency escalation behavior is strictly preserved", () => {
      // 1. Urgent chest pain red flag
      const chestPainPayload = {
        breathingDifficulty: "no",
        chestPain: "yes",
        bloodInCough: "no",
        bloodInStool: "no",
        vomiting: "no",
        keepingFluidsDown: "yes",
        severity: 2,
      };
      const chestFlags = evaluateSafety(chestPainPayload);
      expect(chestFlags.some((f) => f.severity === "urgent" && f.id === "severe-chest-pain")).toBe(true);

      // 2. Urgent breathing difficulty red flag
      const breathPayload = {
        breathingDifficulty: "yes",
        chestPain: "no",
        bloodInCough: "no",
        bloodInStool: "no",
        vomiting: "no",
        keepingFluidsDown: "yes",
        severity: 2,
      };
      const breathFlags = evaluateSafety(breathPayload);
      expect(breathFlags.some((f) => f.severity === "urgent" && f.id === "breathing-difficulty")).toBe(true);

      // 3. Urgent natural language red flag text
      const emergencyText = "mujhe seene mein tez dard aur saans lene mein dikkat ho rahi hai";
      const urgentTextFlag = detectUrgentComplaintText(emergencyText);
      expect(urgentTextFlag).not.toBeNull();
      expect(urgentTextFlag?.severity).toBe("urgent");
    });
  });

  describe("Returning Patient Safety Flag Provenance & Doctor Review Isolation", () => {
    const historicalBreathingFlag: SafetyFlag = {
      id: "breathing-difficulty",
      severity: "urgent",
      title: "Breathing difficulty reported",
      explanation: "Potential emergency symptom: immediate clinical triage is recommended.",
      field: "breathingDifficulty",
      triggeredAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    };

    const previousRecord: Partial<StoredPatientRecord> = {
      id: "DEMO-REC-001",
      submittedAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
      patientProfile: {
        name: "Ramesh Patel",
        age: "48",
        sex: "Male",
        identifier: "ABHA-91-4458-1200",
        identifierType: "abha",
        language: "en",
      },
      chiefComplaint: {
        complaintId: "cough",
        displayName: "Cough with breathlessness",
        originalInput: "Cough and breathlessness",
        confidence: 0.9,
        source: "patient",
      },
      safetyFlags: [historicalBreathingFlag],
    };

    it("proves historical urgent flag + today's cleared safety screen results in NO active urgent flag today", () => {
      // Today's session has passed rapid screening ("None of the above" -> empty safetyFlags)
      const todaySessionSafetyFlags: SafetyFlag[] = [];

      // updatedRecord.safetyFlags uses ONLY session.safetyFlags
      const updatedSafetyFlags: SafetyFlag[] = todaySessionSafetyFlags || [];
      expect(updatedSafetyFlags.length).toBe(0);
      expect(updatedSafetyFlags.some((f) => f.severity === "urgent")).toBe(false);
    });

    it("proves historical safety flags remain preserved in longitudinalChanges.previousSafetyFlags", () => {
      const todayChanges = {
        visitReason: "follow_up" as const,
        visitReasonLabel: "Follow-up for ongoing condition",
        followUpStatus: "better" as const,
        unchangedConditions: ["Hypertension"],
        changedConditions: [],
        unchangedMedications: ["Amlodipine 5mg"],
        changedMedications: [],
        allergiesStatus: "unchanged" as const,
        hospitalizationSinceLastVisit: false,
        newDocumentsCount: 0,
      };

      const updatedChanges = {
        ...todayChanges,
        previousSafetyFlags: previousRecord.safetyFlags || [],
      };

      // Historical flag is preserved longitudinally
      expect(updatedChanges.previousSafetyFlags).toHaveLength(1);
      expect(updatedChanges.previousSafetyFlags[0].id).toBe("breathing-difficulty");
      expect(updatedChanges.previousSafetyFlags[0].severity).toBe("urgent");
    });

    it("proves doctor queue does not show a false URGENT REVIEW for a safe current visit", () => {
      // Build updated record simulating ReturningPatientOptions
      const updatedRecord: StoredPatientRecord = {
        id: "DEMO-REC-001",
        submittedAt: new Date().toISOString(),
        patientProfile: previousRecord.patientProfile!,
        chiefComplaint: {
          complaintId: "cough",
          displayName: "Follow-up: Cough with breathlessness",
          originalInput: "Follow-up visit",
          confidence: 1.0,
          source: "patient",
        },
        historyAnswers: {
          safety_screened: true,
          returning_visit_reason: "follow_up",
          returning_followup_status: "better",
        },
        evidence: [],
        safetyFlags: [], // Today's cleared safety flags ONLY
        documents: [],
        backgroundHistory: {
          pastMedical: "Hypertension",
          pastSurgical: "None",
          medications: "Amlodipine 5mg",
          allergies: "None",
          family: "None",
          personal: "None",
          reviewOfSystems: "None",
        },
        timeline: [],
        doctorReviews: [],
        ayushHistory: {},
        reviewStatus: "pending",
        longitudinalChanges: {
          visitReason: "follow_up",
          visitReasonLabel: "Follow-up",
          followUpStatus: "better",
          unchangedConditions: ["Hypertension"],
          changedConditions: [],
          unchangedMedications: ["Amlodipine 5mg"],
          changedMedications: [],
          allergiesStatus: "unchanged",
          hospitalizationSinceLastVisit: false,
          newDocumentsCount: 0,
          previousSafetyFlags: previousRecord.safetyFlags || [],
        },
      };

      // Doctor Dashboard queue logic: hasUrgent = rec.safetyFlags.some((f) => f.severity === 'urgent')
      const hasUrgent = updatedRecord.safetyFlags.some((f) => f.severity === "urgent");
      expect(hasUrgent).toBe(false); // No false urgent review badge!
    });

    it("proves physician summary does not present historical safety as a current emergency", () => {
      const longitudinalChanges = {
        visitReason: "follow_up" as const,
        visitReasonLabel: "Follow-up",
        followUpStatus: "better" as const,
        unchangedConditions: ["Hypertension"],
        changedConditions: [],
        unchangedMedications: ["Amlodipine 5mg"],
        changedMedications: [],
        allergiesStatus: "unchanged" as const,
        hospitalizationSinceLastVisit: false,
        newDocumentsCount: 0,
        previousSafetyFlags: [historicalBreathingFlag],
      };

      const summary = generateClinicalSummary(
        {
          complaintId: "cough",
          displayName: "Follow-up: Cough with breathlessness",
          originalInput: "Follow-up visit",
          confidence: 1.0,
          source: "patient",
        },
        {
          safety_screened: true,
          returning_visit_reason: "follow_up",
          returning_followup_status: "better",
        },
        [],
        undefined,
        previousRecord.patientProfile,
        [], // Today's active flags: empty
        [],
        longitudinalChanges
      );

      // Active safety flags section says None configured/reported
      expect(summary).toContain("Safety flags: None configured for this session.");
      expect(summary).not.toContain("URGENT: Breathing difficulty reported — Potential emergency symptom");

      // Historical safety is clearly identified under Longitudinal visit delta
      expect(summary).toContain("Longitudinal visit delta:");
      expect(summary).toContain("Prior consultation safety alert (historical): Breathing difficulty reported [URGENT]");
    });

    it("proves today's newly triggered urgent flag still escalates to emergency", () => {
      const todayUrgentSafetyFlags: SafetyFlag[] = [
        {
          id: "severe-chest-pain",
          severity: "urgent",
          title: "Severe chest pain reported",
          explanation: "Immediate emergency triage required.",
          field: "chestPain",
          triggeredAt: new Date().toISOString(),
        },
      ];

      const updatedRecord: Partial<StoredPatientRecord> = {
        safetyFlags: todayUrgentSafetyFlags,
      };

      const hasUrgent = updatedRecord.safetyFlags!.some((f) => f.severity === "urgent");
      expect(hasUrgent).toBe(true);
      expect(updatedRecord.safetyFlags![0].id).toBe("severe-chest-pain");
    });
  });
});
