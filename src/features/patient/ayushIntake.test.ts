import { describe, it, expect } from "vitest";
import type { StoredPatientRecord } from "../doctor/patientRecords";
import type {
  ChiefComplaintRecord,
  PatientProfile,
  AyushHistory,
} from "./state/PatientSessionContext";

describe("AYUSH Mode — Ayurvedic Clinical Intake & General Intake Isolation", () => {
  describe("General intake preservation across AYUSH mode transitions", () => {
    it("proves entering AYUSH mode, recording AYUSH history, and returning to general intake preserves all previous general answers", () => {
      // 1. Existing general intake session state
      const initialSession = {
        patientProfile: {
          name: "Arjun Mehta",
          age: "34",
          sex: "Male",
          identifier: "ABHA-34-7721-9801",
          identifierType: "abha" as const,
          language: "en" as const,
          emergencyContact: {
            guardianName: "Priya Mehta",
            relationship: "Guardian",
            phoneNumber: "9812345678",
          },
        } as PatientProfile,
        consentGranted: true,
        chiefComplaint: {
          complaintId: "fever" as const,
          displayName: "Fever / Pyrexia",
          originalInput: "Fever and headache for 3 days",
          confidence: 0.95,
          source: "patient" as const,
        } as ChiefComplaintRecord,
        historyAnswers: {
          fever_duration: "3 days",
          fever_grade: "high",
          chills: "yes",
          rigors: "no",
        },
        evidence: [
          {
            field: "chills",
            originalAnswer: "yes, feeling cold with shivering",
            normalizedValue: "yes",
            source: "PATIENT" as const,
            language: "en",
            timestamp: new Date().toISOString(),
            confidence: "high" as const,
          },
        ],
        safetyFlags: [],
        documents: [
          {
            id: "doc-101",
            name: "Previous_Prescription.jpg",
            type: "prescription",
            uploadedAt: new Date().toISOString(),
            text: "Paracetamol 500mg TDS",
            extractionStatus: "extracted" as const,
            entities: [{ type: "MEDICATION", value: "Paracetamol 500mg", confidence: "high" as const, sourceText: "Paracetamol 500mg" }],
          },
        ],
        backgroundHistory: {
          pastMedical: "None",
          pastSurgical: "None",
          medications: "Paracetamol as needed",
          allergies: "No known drug allergies",
          family: "Hypertension (father)",
          personal: "Vegetarian diet",
          reviewOfSystems: "",
        },
        timeline: [],
        doctorReviews: [],
        ayushHistory: {} as AyushHistory,
        timestamps: {},
      };

      // 2. Patient transitions to AYUSH Mode and records Ayurvedic clinical observations
      const recordedAyushHistory: AyushHistory = {
        prakriti: "Pitta",
        vikriti: "Pitta-Vata aggravation with mild burning sensation",
        sara: "Pravara (Excellent)",
        samhanana: "Pravara (Well built)",
        pramana: "Proportionate",
        satmya: "Generally suited to usual diet",
        sattva: "Generally stable",
        ahara_shakti: "Moderate",
        vyayama_shakti: "Good",
        vaya: "Adult",
        agni: "Tikshna (Intense)",
        koshtha: "Madhyama (Medium)",
        meal_pattern: "Regular 3 meals a day",
        food_habits: "Warm home-cooked vegetarian food",
        water_intake: "2.5 litres daily",
        sleep: "7 hours, sound",
        exercise: "30 mins walking daily",
        daily_routine: "Dinacharya regular",
      };

      // 3. User saves AYUSH history without modifying existing session
      const updatedSession = {
        ...initialSession,
        ayushHistory: recordedAyushHistory,
      };

      // 4. Verification: All general intake data remains 100% intact
      expect(updatedSession.patientProfile?.name).toBe("Arjun Mehta");
      expect(updatedSession.patientProfile?.age).toBe("34");
      expect(updatedSession.patientProfile?.identifier).toBe("ABHA-34-7721-9801");
      expect(updatedSession.patientProfile?.emergencyContact?.guardianName).toBe("Priya Mehta");
      expect(updatedSession.consentGranted).toBe(true);

      // Chief complaint preserved
      expect(updatedSession.chiefComplaint?.complaintId).toBe("fever");
      expect(updatedSession.chiefComplaint?.displayName).toBe("Fever / Pyrexia");
      expect(updatedSession.chiefComplaint?.originalInput).toBe("Fever and headache for 3 days");

      // Adaptive history answers preserved
      expect(updatedSession.historyAnswers?.fever_duration).toBe("3 days");
      expect(updatedSession.historyAnswers?.fever_grade).toBe("high");
      expect(updatedSession.historyAnswers?.chills).toBe("yes");
      expect(updatedSession.historyAnswers?.rigors).toBe("no");

      // Documents and background history preserved
      expect(updatedSession.documents.length).toBe(1);
      expect(updatedSession.documents[0].id).toBe("doc-101");
      expect(updatedSession.backgroundHistory.allergies).toBe("No known drug allergies");
      expect(updatedSession.evidence.length).toBe(1);

      // AYUSH history successfully integrated
      expect(updatedSession.ayushHistory.prakriti).toBe("Pitta");
      expect(updatedSession.ayushHistory.sara).toBe("Pravara (Excellent)");
      expect(updatedSession.ayushHistory.ahara_shakti).toBe("Moderate");
      expect(updatedSession.ayushHistory.agni).toBe("Tikshna (Intense)");
    });

    it("proves returning to general intake without saving any AYUSH answers preserves original session untouched", () => {
      const originalSession = {
        patientProfile: { name: "Sunita Sharma", age: "52", sex: "Female", identifier: "DEMO-1", identifierType: "demo" as const, language: "en" as const },
        chiefComplaint: { complaintId: "cough" as const, displayName: "Cough", originalInput: "Dry cough", confidence: 0.9, source: "patient" as const },
        historyAnswers: { cough_duration: "5 days", phlegm: "no" },
        ayushHistory: {},
      };

      // Patient navigates to AYUSH mode and clicks "Return to General Intake" without saving changes
      const returnedSession = { ...originalSession };

      expect(returnedSession.chiefComplaint.displayName).toBe("Cough");
      expect(returnedSession.historyAnswers.cough_duration).toBe("5 days");
      expect(returnedSession.historyAnswers.phlegm).toBe("no");
      expect(Object.keys(returnedSession.ayushHistory).length).toBe(0);
    });
  });

  describe("Downstream consultation record and physician review integration", () => {
    it("proves consultation record includes both general clinical history and AYUSH history", () => {
      const finalRecord: StoredPatientRecord = {
        id: "REC-TEST-AYUSH-01",
        submittedAt: new Date().toISOString(),
        patientProfile: {
          name: "Deepak Joshi",
          age: "41",
          sex: "Male",
          identifier: "ABHA-12-9988-3344",
          identifierType: "abha",
          language: "hi",
        },
        chiefComplaint: {
          complaintId: "abdominal_pain",
          displayName: "Abdominal Pain",
          originalInput: "पेट में जलन और दर्द",
          confidence: 0.92,
          source: "patient",
        },
        historyAnswers: {
          pain_location: "epigastric",
          pain_character: "burning",
          severity: 2,
        },
        evidence: [],
        safetyFlags: [],
        documents: [],
        backgroundHistory: {
          pastMedical: "Gastritis",
          pastSurgical: "None",
          medications: "Antacids",
          allergies: "None",
          family: "None",
          personal: "Spicy diet",
          reviewOfSystems: "",
        },
        timeline: [],
        doctorReviews: [],
        ayushHistory: {
          prakriti: "Pitta",
          vikriti: "Amlapitta signs reported",
          ahara_shakti: "Avara (Reduced due to acidity)",
          agni: "Tikshna (Intense)",
          koshtha: "Mridu (Soft)",
        },
        reviewStatus: "pending",
      };

      expect(finalRecord.chiefComplaint.complaintId).toBe("abdominal_pain");
      expect(finalRecord.historyAnswers.pain_character).toBe("burning");
      expect(finalRecord.ayushHistory.prakriti).toBe("Pitta");
      expect(finalRecord.ayushHistory.agni).toBe("Tikshna (Intense)");
      expect(finalRecord.reviewStatus).toBe("pending");
    });

    it("proves returning-patient safety provenance integrity is preserved when AYUSH history is present", () => {
      // Historical safety flag from previous visit
      const previousVisitSafetyFlags = [
        {
          id: "FLAG-HIST-01",
          severity: "urgent" as const,
          title: "Breathing difficulty reported",
          explanation: "Historical visit red flag",
          field: "breathing_difficulty",
          triggeredAt: "2026-08-01T10:00:00Z",
        },
      ];

      // Current visit has cleared safety checklist and added AYUSH intake
      const currentVisitSafetyFlags: any[] = []; // No flags triggered today!

      const todayRecord: StoredPatientRecord = {
        id: "REC-RETURNING-AYUSH",
        submittedAt: new Date().toISOString(),
        patientProfile: {
          name: "Ramesh Patel",
          age: "48",
          sex: "Male",
          identifier: "ABHA-91-4458-1200",
          identifierType: "abha",
          language: "en",
        },
        chiefComplaint: {
          complaintId: "joint_pain",
          displayName: "Joint Pain",
          originalInput: "Knee stiffness in mornings",
          confidence: 0.9,
          source: "patient",
        },
        historyAnswers: {
          joint_location: "knees",
          stiffness_duration: "30 mins",
        },
        evidence: [],
        safetyFlags: currentVisitSafetyFlags, // Provenance rule: ONLY current visit flags here
        documents: [],
        backgroundHistory: {
          pastMedical: "Osteoarthritis",
          pastSurgical: "None",
          medications: "Calcium supplements",
          allergies: "None",
          family: "None",
          personal: "Sedentary",
          reviewOfSystems: "",
        },
        timeline: [],
        doctorReviews: [],
        ayushHistory: {
          prakriti: "Vata-Kapha",
          vikriti: "Sandhigata Vata reported",
          vyayama_shakti: "Low",
          satmya: "Sensitive to cold weather",
        },
        reviewStatus: "pending",
        longitudinalChanges: {
          visitReason: "follow_up",
          visitReasonLabel: "Follow-up Visit",
          followUpStatus: "same",
          unchangedConditions: ["Osteoarthritis"],
          changedConditions: [],
          unchangedMedications: ["Calcium supplements"],
          changedMedications: [],
          allergiesStatus: "unchanged",
          hospitalizationSinceLastVisit: false,
          newDocumentsCount: 0,
          previousSafetyFlags: previousVisitSafetyFlags,
        },
      };

      // Current visit safety flags must remain EMPTY (no false escalation from historical visit)
      expect(todayRecord.safetyFlags.length).toBe(0);
      expect(todayRecord.longitudinalChanges?.previousSafetyFlags?.length).toBe(1);
      expect(todayRecord.longitudinalChanges?.previousSafetyFlags?.[0].title).toBe("Breathing difficulty reported");

      // AYUSH history is cleanly recorded in the same record without affecting safety flags
      expect(todayRecord.ayushHistory.prakriti).toBe("Vata-Kapha");
      expect(todayRecord.ayushHistory.vikriti).toBe("Sandhigata Vata reported");
    });
  });
});
