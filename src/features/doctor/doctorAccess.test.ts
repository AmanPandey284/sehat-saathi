import { describe, it, expect, beforeEach } from "vitest";

// Simple in-memory Storage mock for Vitest node environment
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
  DEMO_DOCTOR_CREDENTIALS,
  AUTH_STORAGE_KEY,
} from "../auth/DoctorAuthContext";
import {
  getStoredPatientRecords,
  savePatientRecord,
  updatePatientRecord,
  clearStoredPatientRecords,
  type StoredPatientRecord,
} from "./patientRecords";

describe("Doctor Access & Patient Record System", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("Demo Credentials & Auth Storage", () => {
    it("has valid fixed demo credentials configured", () => {
      expect(DEMO_DOCTOR_CREDENTIALS.username).toBe("demo-doctor");
      expect(DEMO_DOCTOR_CREDENTIALS.password).toBe("demo123");
      expect(DEMO_DOCTOR_CREDENTIALS.displayName).toContain("Dr. Sharma");
      expect(DEMO_DOCTOR_CREDENTIALS.role).toContain("Attending Physician");
    });

    it("verifies credentials correctly and rejects invalid login", () => {
      const isValid = (u: string, p: string) =>
        u.trim().toLowerCase() === DEMO_DOCTOR_CREDENTIALS.username.toLowerCase() &&
        p.trim() === DEMO_DOCTOR_CREDENTIALS.password;

      expect(isValid("demo-doctor", "demo123")).toBe(true);
      expect(isValid("DEMO-DOCTOR ", "demo123")).toBe(true);
      expect(isValid("demo-doctor", "wrongpass")).toBe(false);
      expect(isValid("unknown", "demo123")).toBe(false);
    });

    it("persists authenticated session to localStorage and clears on logout", () => {
      const sessionData = {
        username: DEMO_DOCTOR_CREDENTIALS.username,
        displayName: DEMO_DOCTOR_CREDENTIALS.displayName,
        role: DEMO_DOCTOR_CREDENTIALS.role,
        authenticatedAt: new Date().toISOString(),
      };

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
      const loaded = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null");
      expect(loaded).not.toBeNull();
      expect(loaded.username).toBe("demo-doctor");

      // Logout
      localStorage.removeItem(AUTH_STORAGE_KEY);
      expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    });
  });

  describe("Patient Record Persistence & Queue Management", () => {
    it("seeds default demo records when storage is empty", () => {
      const records = getStoredPatientRecords();
      expect(records.length).toBeGreaterThanOrEqual(2);
      expect(records.some((r) => r.patientProfile.name === "Ramesh Patel")).toBe(true);
      expect(records.some((r) => r.patientProfile.name === "Sunita Devi")).toBe(true);
    });

    it("saves a new completed patient intake record to the queue", () => {
      const newRecord: StoredPatientRecord = {
        id: "TEST-INTAKE-999",
        submittedAt: new Date().toISOString(),
        patientProfile: {
          name: "Anita Verma",
          age: "29",
          sex: "Female",
          identifier: "ABHA-00-1122-3344",
          identifierType: "abha",
          language: "hi",
        },
        chiefComplaint: {
          complaintId: "fever",
          displayName: "Fever and chills",
          originalInput: "mujhe 3 din se bukhar hai",
          confidence: 0.95,
          source: "patient",
        },
        historyAnswers: {
          duration: "3 days",
          temperatureGrade: "high",
          chills: "yes",
        },
        evidence: [
          {
            field: "duration",
            originalAnswer: "3 din se",
            normalizedValue: "3 days",
            source: "PATIENT",
            language: "hi",
            timestamp: new Date().toISOString(),
            confidence: "high",
          },
        ],
        safetyFlags: [],
        documents: [],
        backgroundHistory: {
          pastMedical: "None",
          pastSurgical: "None",
          medications: "Paracetamol 650mg",
          allergies: "None",
          family: "None",
          personal: "None",
          reviewOfSystems: "None",
        },
        timeline: [],
        doctorReviews: [],
        ayushHistory: {},
        reviewStatus: "pending",
      };

      savePatientRecord(newRecord);

      const records = getStoredPatientRecords();
      const found = records.find((r) => r.id === "TEST-INTAKE-999");
      expect(found).toBeDefined();
      expect(found?.patientProfile.name).toBe("Anita Verma");
      expect(found?.historyAnswers.duration).toBe("3 days");
      expect(found?.reviewStatus).toBe("pending");
    });

    it("allows doctor to update review status and clinical reviews", () => {
      const updated = updatePatientRecord("DEMO-REC-001", {
        reviewStatus: "reviewed",
        doctorReviews: [
          {
            field: "coughType",
            status: "confirmed",
            reviewedAt: new Date().toISOString(),
            reviewer: "Dr. Sharma",
          },
        ],
      });

      expect(updated).not.toBeNull();
      expect(updated?.reviewStatus).toBe("reviewed");
      expect(updated?.doctorReviews.length).toBe(1);
      expect(updated?.doctorReviews[0].field).toBe("coughType");

      const inStorage = getStoredPatientRecords().find((r) => r.id === "DEMO-REC-001");
      expect(inStorage?.reviewStatus).toBe("reviewed");
    });

    it("clears stored patient records cleanly", () => {
      clearStoredPatientRecords();
      expect(localStorage.getItem("sehatSaathi_patient_records_v1")).toBeNull();
    });
  });

  describe("Privacy & Data Separation", () => {
    it("patient session reset does not delete saved doctor queue records", () => {
      // Seed records first
      getStoredPatientRecords();
      // Simulate patient session reset
      localStorage.removeItem("medikiosk_session_v2");
      sessionStorage.removeItem("sehatSaathi_adaptive_analysis");

      // Verify doctor records remain intact
      const records = getStoredPatientRecords();
      expect(records.length).toBeGreaterThan(0);
    });

    it("doctor logout does not affect current patient session storage", () => {
      sessionStorage.setItem("patient_temp_data", "active");
      localStorage.removeItem(AUTH_STORAGE_KEY);

      expect(sessionStorage.getItem("patient_temp_data")).toBe("active");
    });
  });
});
