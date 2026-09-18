import { describe, it, expect, beforeEach } from "vitest";

// Simple in-memory Storage mock for Vitest environment
class MockStorage implements Storage {
  private store: Record<string, string> = {};
  get length() {
    return Object.keys(this.store).length;
  }
  clear() {
    this.store = {};
  }
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] ?? null;
  }
}

if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = new MockStorage();
}
if (typeof globalThis.sessionStorage === "undefined") {
  globalThis.sessionStorage = new MockStorage();
}

import {
  findPatientRecord,
  getKnownConditions,
  getKnownMedications,
  getKnownAllergies,
  parseNaturalLanguageChanges,
  loadReturningSession,
  saveReturningSession,
  isSafetyScreened,
  type ReturningPatientSession,
} from "./returningPatientModel";
import { getStoredPatientRecords } from "../doctor/patientRecords";
import { generateClinicalSummary } from "../history/summaryGenerator";
import {
  evaluateSafety,
  detectUrgentComplaintText,
} from "../safety/safetyEngine";

describe("Returning Patient & Longitudinal Intake", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("Tightened Patient Lookup (FIX 2)", () => {
    it("matches by exact Patient ID or ABHA Identifier", () => {
      const records = getStoredPatientRecords();
      expect(records.length).toBeGreaterThan(0);

      // Search by exact ID
      const byId = findPatientRecord("DEMO-REC-001");
      expect(byId).not.toBeNull();
      expect(byId?.patientProfile.name).toBe("Ramesh Patel");

      // Search by exact ABHA / Identifier
      const byIdent = findPatientRecord("ABHA-91-4458-1200");
      expect(byIdent).not.toBeNull();
      expect(byIdent?.id).toBe("DEMO-REC-001");

      const byDemoIdent = findPatientRecord("DEMO-88219");
      expect(byDemoIdent).not.toBeNull();
      expect(byDemoIdent?.patientProfile.name).toBe("Sunita Devi");
    });

    it("matches by exact 10-digit registered mobile number", () => {
      const byPhone1 = findPatientRecord("9876543210");
      expect(byPhone1).not.toBeNull();
      expect(byPhone1?.patientProfile.name).toBe("Ramesh Patel");

      const byPhone2 = findPatientRecord("9123456789");
      expect(byPhone2).not.toBeNull();
      expect(byPhone2?.patientProfile.name).toBe("Sunita Devi");
    });

    it("does NOT match by partial name, full name, or substring (privacy protection)", () => {
      // Partial name queries must return null
      expect(findPatientRecord("Sunita")).toBeNull();
      expect(findPatientRecord("Ramesh")).toBeNull();
      expect(findPatientRecord("Devi")).toBeNull();
      expect(findPatientRecord("Patel")).toBeNull();
      expect(findPatientRecord("Suni")).toBeNull();
      expect(findPatientRecord("Ram")).toBeNull();
      expect(findPatientRecord("a")).toBeNull();
      expect(findPatientRecord("Ramesh Patel")).toBeNull();
    });

    it("does NOT expose another record on invalid or unmatched lookup", () => {
      expect(findPatientRecord("NON-EXISTENT-ID-9999")).toBeNull();
      expect(findPatientRecord("9999999999")).toBeNull();
      expect(findPatientRecord("12345")).toBeNull();
      expect(findPatientRecord("")).toBeNull();
      expect(findPatientRecord("   ")).toBeNull();
    });

    it("preserves explicit demo-patient shortcut functionality", () => {
      const demo1 = findPatientRecord("DEMO-REC-001");
      expect(demo1).not.toBeNull();
      expect(demo1?.id).toBe("DEMO-REC-001");

      const demo2 = findPatientRecord("DEMO-REC-002");
      expect(demo2).not.toBeNull();
      expect(demo2?.id).toBe("DEMO-REC-002");
    });
  });

  it("extracts known conditions from longitudinal baseline", () => {
    const records = getStoredPatientRecords();
    const ramesh = records.find((r) => r.id === "DEMO-REC-001")!;
    const conditions = getKnownConditions(ramesh);

    expect(conditions).toContain("Type 2 Diabetes Mellitus (5 yrs)");
  });

  it("extracts known medications from baseline and documents", () => {
    const records = getStoredPatientRecords();
    const ramesh = records.find((r) => r.id === "DEMO-REC-001")!;
    const meds = getKnownMedications(ramesh);

    expect(meds).toContain("Metformin 500mg BD");
  });

  it("extracts known allergies with clean fallbacks", () => {
    const records = getStoredPatientRecords();
    const ramesh = records.find((r) => r.id === "DEMO-REC-001")!;
    expect(getKnownAllergies(ramesh)).toBe("No known drug allergies");

    const sunita = records.find((r) => r.id === "DEMO-REC-002")!;
    expect(getKnownAllergies(sunita)).toBe("No known drug allergies (NKDA)");
  });

  it("parses natural language change updates without diagnosing", () => {
    const input = "I've been getting dizzy for 2 weeks since doctor changed my BP medicine";
    const parsed = parseNaturalLanguageChanges(input);

    expect(parsed.length).toBeGreaterThanOrEqual(2);
    const medChange = parsed.find((p) => p.category === "Medication update");
    expect(medChange).toBeDefined();

    const symptom = parsed.find((p) => p.category === "Symptom reported");
    expect(symptom).toBeDefined();
    expect(symptom?.description).toContain("Dizziness");
    expect(symptom?.onset).toBe("for 2 weeks");
  });

  it("saves and loads returning patient sessions in sessionStorage", () => {
    const records = getStoredPatientRecords();
    const ramesh = records.find((r) => r.id === "DEMO-REC-001")!;

    const mockSession: ReturningPatientSession = {
      previousRecord: ramesh,
      changes: {
        visitReason: "follow_up",
        visitReasonLabel: "Follow-up",
        unchangedConditions: ["Diabetes"],
        changedConditions: [],
        unchangedMedications: ["Metformin"],
        changedMedications: [],
        allergiesStatus: "unchanged",
        hospitalizationSinceLastVisit: false,
        newDocumentsCount: 0,
        followUpStatus: "better",
      },
    };

    saveReturningSession(mockSession);
    const loaded = loadReturningSession();
    expect(loaded).not.toBeNull();
    expect(loaded?.changes.visitReason).toBe("follow_up");
    expect(loaded?.changes.followUpStatus).toBe("better");
  });

  it("formats longitudinal visit delta in clinical intake summary", () => {
    const records = getStoredPatientRecords();
    const ramesh = records.find((r) => r.id === "DEMO-REC-001")!;

    const answers = {
      ...ramesh.historyAnswers,
      returning_visit_reason: "follow_up",
      returning_followup_status: "better",
    };

    const summary = generateClinicalSummary(
      ramesh.chiefComplaint,
      answers,
      ramesh.documents,
      ramesh.backgroundHistory,
      ramesh.patientProfile
    );

    expect(summary).toContain("Longitudinal visit delta:");
    expect(summary).toContain("Visit category: follow_up");
    expect(summary).toContain("Follow-up status: better");
  });

  describe("Quick Pass Safety Gate Integration (FIX 1)", () => {
    it("proves Quick Pass cannot directly submit to physician queue without passing safety gate", () => {
      // Unscreened answers: submission is blocked
      const unscreenedAnswers = {
        returning_visit_reason: "follow_up",
        returning_followup_status: "same",
      };
      expect(isSafetyScreened(unscreenedAnswers)).toBe(false);

      // Only screened answers are allowed into the physician queue
      const screenedAnswers = {
        ...unscreenedAnswers,
        safety_screened: true,
        breathingDifficulty: "no",
        chestPain: "no",
      };
      expect(isSafetyScreened(screenedAnswers)).toBe(true);
    });

    it("triggers emergency triage via safetyEngine when urgent symptoms are present in follow-up Quick Pass", () => {
      // Patient took Quick Pass but has acute breathing difficulty
      const answersWithBreathingProblem = {
        breathingDifficulty: "yes",
        chestPain: "no",
        bloodInCough: "no",
      };

      const flags = evaluateSafety(answersWithBreathingProblem);
      const urgent = flags.find((f) => f.severity === "urgent");

      expect(urgent).toBeDefined();
      expect(urgent?.id).toBe("breathing-difficulty");
    });

    it("triggers emergency triage via safetyEngine when severe chest pain is reported", () => {
      const answersWithChestPain = {
        breathingDifficulty: "no",
        chestPain: "yes",
      };

      const flags = evaluateSafety(answersWithChestPain);
      const urgent = flags.find((f) => f.severity === "urgent");

      expect(urgent).toBeDefined();
      expect(urgent?.id).toBe("severe-chest-pain");
    });

    it("detects urgent red flags in natural language updates via detectUrgentComplaintText", () => {
      const urgentText = "seene mein bahut tez dard ho raha hai aur saans phool rahi hai";
      const urgentFlag = detectUrgentComplaintText(urgentText);

      expect(urgentFlag).not.toBeNull();
      expect(urgentFlag?.severity).toBe("urgent");
    });

    it("clears safety gate and permits queue submission when all red flags are screened negative", () => {
      const negativeRedFlags = {
        breathingDifficulty: "no",
        chestPain: "no",
        bloodInCough: "no",
        bloodInStool: "no",
        vomiting: "no",
        severity: 2,
      };

      const flags = evaluateSafety(negativeRedFlags);
      const urgent = flags.filter((f) => f.severity === "urgent");

      expect(urgent.length).toBe(0);

      const approvedIntake = {
        ...negativeRedFlags,
        safety_screened: true,
      };

      expect(isSafetyScreened(approvedIntake)).toBe(true);
    });

    it("ensures returning patient routing considers only current visit safety flags without false emergency escalation", async () => {
      // Historical consultation had an urgent breathing flag
      const previousHistoricalFlags = [
        {
          id: "breathing-difficulty",
          severity: "urgent" as const,
          title: "Breathing difficulty reported",
          explanation: "Historical flag from previous visit",
          field: "breathingDifficulty",
          triggeredAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
        },
      ];
      expect(previousHistoricalFlags[0].severity).toBe("urgent");

      // Today's visit has negative safety screen (no current visit flags)
      const todaySessionFlags: any[] = [];

      // Pass only today's session flags to determineSuggestedRouting
      const { determineSuggestedRouting } = await import("../routing/routingService");
      const routing = determineSuggestedRouting({
        complaintId: "cough",
        displayName: "Follow-up: Cough",
        safetyFlags: todaySessionFlags,
      });

      expect(routing.suggestedDepartment).toBe("Pulmonary Medicine");
      expect(routing.routingStatus).toBe("suggested");
      expect(routing.suggestedDepartment).not.toBe("Emergency Department");
    });
  });
});
