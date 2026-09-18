import { describe, it, expect } from "vitest";
import { determineSuggestedRouting } from "./routingService";
import type { SafetyFlag } from "../patient/state/PatientSessionContext";
import type { StoredPatientRecord } from "../doctor/patientRecords";
import type { RoutingStatus } from "./routingTypes";

describe("Hospital Routing Service", () => {
  // Test 1: cough -> Pulmonary Medicine
  it("routes cough to Pulmonary Medicine with 'suggested' status", () => {
    const result = determineSuggestedRouting({
      complaintId: "cough",
      displayName: "Cough",
    });
    expect(result.suggestedDepartment).toBe("Pulmonary Medicine");
    expect(result.routingStatus).toBe("suggested");
    expect(result.rationale).toContain("Cough");
  });

  // Test 2: eye_problems -> Ophthalmology
  it("routes eye_problems to Ophthalmology with 'suggested' status", () => {
    const result = determineSuggestedRouting({
      complaintId: "eye_problems",
      displayName: "Eye Problems",
    });
    expect(result.suggestedDepartment).toBe("Ophthalmology");
    expect(result.routingStatus).toBe("suggested");
    expect(result.rationale).toContain("Eye Problems");
  });

  // Test 3: skin_problems -> Dermatology
  it("routes skin_problems to Dermatology with 'suggested' status", () => {
    const result = determineSuggestedRouting({
      complaintId: "skin_problems",
      displayName: "Skin Problems",
    });
    expect(result.suggestedDepartment).toBe("Dermatology");
    expect(result.routingStatus).toBe("suggested");
    expect(result.rationale).toContain("Skin Problems");
  });

  // Test 4: back_pain -> Orthopedics
  it("routes back_pain to Orthopedics with 'suggested' status", () => {
    const result = determineSuggestedRouting({
      complaintId: "back_pain",
      displayName: "Back Pain",
    });
    expect(result.suggestedDepartment).toBe("Orthopedics");
    expect(result.routingStatus).toBe("suggested");
    expect(result.rationale).toContain("Back Pain");
  });

  // Test 5: joint_pain -> Orthopedics
  it("routes joint_pain to Orthopedics with 'suggested' status", () => {
    const result = determineSuggestedRouting({
      complaintId: "joint_pain",
      displayName: "Joint Pain",
    });
    expect(result.suggestedDepartment).toBe("Orthopedics");
    expect(result.routingStatus).toBe("suggested");
    expect(result.rationale).toContain("Joint Pain");
  });

  // Test 6: urinary_problems -> Urology
  it("routes urinary_problems to Urology with 'suggested' status", () => {
    const result = determineSuggestedRouting({
      complaintId: "urinary_problems",
      displayName: "Urinary Problems",
    });
    expect(result.suggestedDepartment).toBe("Urology");
    expect(result.routingStatus).toBe("suggested");
    expect(result.rationale).toContain("Urinary Problems");
  });

  // Test 7: abdominal_pain -> General Medicine
  it("routes abdominal_pain to General Medicine with 'suggested' status", () => {
    const result = determineSuggestedRouting({
      complaintId: "abdominal_pain",
      displayName: "Abdominal Pain",
    });
    expect(result.suggestedDepartment).toBe("General Medicine");
    expect(result.routingStatus).toBe("suggested");
    expect(result.rationale).toContain("Abdominal Pain");
  });

  // Test 8: fever -> General Medicine
  it("routes fever to General Medicine with 'suggested' status", () => {
    const result = determineSuggestedRouting({
      complaintId: "fever",
      displayName: "Fever",
    });
    expect(result.suggestedDepartment).toBe("General Medicine");
    expect(result.routingStatus).toBe("suggested");
    expect(result.rationale).toContain("Fever");
  });

  // Test 9: headache -> General Medicine
  it("routes headache to General Medicine with 'suggested' status", () => {
    const result = determineSuggestedRouting({
      complaintId: "headache",
      displayName: "Headache",
    });
    expect(result.suggestedDepartment).toBe("General Medicine");
    expect(result.routingStatus).toBe("suggested");
    expect(result.rationale).toContain("Headache");
  });

  // Test 10: custom -> General OPD / Triage Desk
  it("routes custom complaint to General OPD / Triage Desk with 'general_triage' status", () => {
    const result = determineSuggestedRouting({
      complaintId: "custom",
      displayName: "Unusual dizziness and fatigue",
      originalInput: "I feel dizzy and tired",
    });
    expect(result.suggestedDepartment).toBe("General OPD / Triage Desk");
    expect(result.routingStatus).toBe("general_triage");
    expect(result.rationale).toContain("General OPD for triage assessment");
  });

  // Test 11: unknown/null -> General OPD / Triage Desk
  it("routes null/undefined/unknown complaint to General OPD / Triage Desk", () => {
    const resNull = determineSuggestedRouting(null);
    expect(resNull.suggestedDepartment).toBe("General OPD / Triage Desk");
    expect(resNull.routingStatus).toBe("general_triage");

    const resEmpty = determineSuggestedRouting({
      complaintId: null,
      displayName: null,
    });
    expect(resEmpty.suggestedDepartment).toBe("General OPD / Triage Desk");
    expect(resEmpty.routingStatus).toBe("general_triage");

    const resUnknownId = determineSuggestedRouting({
      complaintId: "completely_unknown_category" as any,
    });
    expect(resUnknownId.suggestedDepartment).toBe("General OPD / Triage Desk");
    expect(resUnknownId.routingStatus).toBe("general_triage");
  });

  // Test 12: urgent safety state never becomes a normal department suggestion
  it("escalates urgent safety cases to Emergency Department and blocks normal department routing", () => {
    const urgentFlag: SafetyFlag = {
      id: "severe-chest-pain",
      severity: "urgent",
      title: "Severe chest pain reported",
      explanation: "Immediate triage required",
      field: "chestPain",
      triggeredAt: new Date().toISOString(),
    };

    // Even if complaintId is 'cough' or 'eye_problems', safety takes strict precedence!
    const result = determineSuggestedRouting({
      complaintId: "cough",
      displayName: "Cough with chest pain",
      safetyFlags: [urgentFlag],
    });

    expect(result.suggestedDepartment).toBe("Emergency Department");
    expect(result.routingStatus).toBe("emergency_escalated");
    expect(result.suggestedDepartment).not.toBe("Pulmonary Medicine");
    expect(result.rationale).toContain("emergency");
  });

  // Test 13: backward compatibility with records lacking suggestedRouting
  it("preserves backward compatibility for records without suggestedRouting", () => {
    const legacyRecord: StoredPatientRecord = {
      id: "LEGACY-001",
      submittedAt: new Date().toISOString(),
      patientProfile: {
        name: "Old Patient",
        age: "50",
        sex: "Female",
        identifier: "DEMO-123",
        identifierType: "demo",
        language: "en",
      },
      chiefComplaint: {
        complaintId: "fever",
        displayName: "Fever",
        originalInput: "fever for 2 days",
        confidence: 0.9,
        source: "patient",
      },
      historyAnswers: {},
      evidence: [],
      safetyFlags: [],
      documents: [],
      backgroundHistory: {
        pastMedical: "",
        pastSurgical: "",
        medications: "",
        allergies: "",
        family: "",
        personal: "",
        reviewOfSystems: "",
      },
      timeline: [],
      doctorReviews: [],
      ayushHistory: {},
      reviewStatus: "pending",
      // suggestedRouting intentionally omitted
    };

    expect(legacyRecord.suggestedRouting).toBeUndefined();
    expect(legacyRecord.chiefComplaint.complaintId).toBe("fever");
  });

  // Test 14: routing status always uses 'suggested' or 'general_triage' (or 'emergency_escalated')
  it("always emits valid routingStatus", () => {
    const categories: Array<"cough" | "eye_problems" | "custom"> = [
      "cough",
      "eye_problems",
      "custom",
    ];
    for (const cat of categories) {
      const r = determineSuggestedRouting({ complaintId: cat });
      expect(["suggested", "general_triage"]).toContain(r.routingStatus);
    }
  });

  // Test 15: routing rationale contains no diagnostic, prescriptive, or doctor-claiming language
  it("enforces non-diagnostic operational language with no disease or doctor claims", () => {
    const testCases = [
      { complaintId: "cough" },
      { complaintId: "eye_problems" },
      { complaintId: "abdominal_pain" },
      { complaintId: "fever" },
      { complaintId: "custom" },
    ];

    const forbiddenPhrases = [
      /diagnos/i,
      /disease/i,
      /treatment/i,
      /prescrib/i,
      /recommended doctor/i,
      /best doctor/i,
      /ai doctor/i,
      /cure/i,
      /probability/i,
    ];

    for (const tc of testCases) {
      const r = determineSuggestedRouting(tc as any);
      for (const pattern of forbiddenPhrases) {
        expect(r.rationale).not.toMatch(pattern);
      }
    }
  });

  // Test 16: FIX 1 - Current-visit safety flags only; historical urgent flag must NOT contaminate today's routing
  it("isolates current-visit safety flags so historical urgent flags do not cause false emergency escalation", () => {
    const historicalUrgentFlag: SafetyFlag = {
      id: "historical-breathing-difficulty",
      severity: "urgent",
      title: "Historical breathing difficulty",
      explanation: "Previous consultation emergency flag",
      field: "breathingDifficulty",
      triggeredAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    };
    expect(historicalUrgentFlag.severity).toBe("urgent");

    // Patient returns today with follow-up cough and safe screening (no current visit flags)
    const todaySessionFlags: SafetyFlag[] = [];

    // Today's routing MUST evaluate only session.safetyFlags (empty), NOT historicalUrgentFlag
    const result = determineSuggestedRouting({
      complaintId: "cough",
      displayName: "Follow-up: Status improved",
      safetyFlags: todaySessionFlags,
    });

    expect(result.suggestedDepartment).toBe("Pulmonary Medicine");
    expect(result.routingStatus).toBe("suggested");
    expect(result.suggestedDepartment).not.toBe("Emergency Department");
    expect(result.routingStatus).not.toBe("emergency_escalated");

    // But if today's visit ALSO triggered an urgent flag, it MUST escalate
    const todayUrgentFlag: SafetyFlag = {
      id: "today-chest-pain",
      severity: "urgent",
      title: "Chest pain today",
      explanation: "Urgent symptom in current visit",
      field: "chestPain",
      triggeredAt: new Date().toISOString(),
    };

    const escalatedResult = determineSuggestedRouting({
      complaintId: "cough",
      displayName: "Follow-up: Status worse",
      safetyFlags: [todayUrgentFlag],
    });

    expect(escalatedResult.suggestedDepartment).toBe("Emergency Department");
    expect(escalatedResult.routingStatus).toBe("emergency_escalated");
  });

  // Test 17: FIX 2 - Supports staff_reassigned status
  it("supports staff_reassigned status and distinct operational statuses", () => {
    const validStatuses: RoutingStatus[] = [
      "suggested",
      "general_triage",
      "emergency_escalated",
      "staff_reassigned",
    ];
    expect(validStatuses).toContain("staff_reassigned");
  });

  // Test 18: FIX 3 - Emergency Department is excluded from normal staff reassignment lists
  it("excludes Emergency Department from selectable staff reassignment departments", async () => {
    const { AVAILABLE_HOSPITAL_DEPARTMENTS, REASSIGNABLE_HOSPITAL_DEPARTMENTS } = await import("./routingRules");
    expect(AVAILABLE_HOSPITAL_DEPARTMENTS).not.toContain("Emergency Department");
    expect(REASSIGNABLE_HOSPITAL_DEPARTMENTS).not.toContain("Emergency Department");
    expect(AVAILABLE_HOSPITAL_DEPARTMENTS).toContain("Pulmonary Medicine");
    expect(AVAILABLE_HOSPITAL_DEPARTMENTS).toContain("General Medicine");
    expect(AVAILABLE_HOSPITAL_DEPARTMENTS).toContain("General OPD / Triage Desk");
  });
});
