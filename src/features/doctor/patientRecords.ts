import type {
  ChiefComplaintRecord,
  PatientProfile,
  BackgroundHistory,
  ClinicalDocument,
  SafetyFlag,
  TimelineEvent,
  DoctorReview,
  AyushHistory,
} from "../patient/state/PatientSessionContext";
import type { AnswerValue } from "../patient/engine/types";
import type { AnswerEvidence } from "../patient/services/clinicalNormalizer";

export interface StoredPatientRecord {
  id: string;
  submittedAt: string;
  patientProfile: PatientProfile;
  chiefComplaint: ChiefComplaintRecord;
  historyAnswers: Record<string, AnswerValue>;
  evidence: AnswerEvidence[];
  safetyFlags: SafetyFlag[];
  documents: ClinicalDocument[];
  backgroundHistory: BackgroundHistory;
  timeline: TimelineEvent[];
  doctorReviews: DoctorReview[];
  ayushHistory: AyushHistory;
  reviewStatus: "pending" | "reviewed";
}

const STORAGE_KEY = "sehatSaathi_patient_records_v1";

const DEMO_SEEDS: StoredPatientRecord[] = [
  {
    id: "DEMO-REC-001",
    submittedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
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
      originalInput: "I have cough and breathlessness for 4 days",
      confidence: 0.9,
      source: "patient",
    },
    historyAnswers: {
      duration: "4 days",
      coughType: "productive",
      phlegmColor: "yellow_green",
      fever: "yes",
      breathlessness: "yes",
      chestPain: "no",
      bloodInCough: "no",
    },
    evidence: [
      {
        field: "duration",
        originalAnswer: "4 days",
        normalizedValue: "4 days",
        source: "PATIENT",
        language: "en",
        timestamp: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
        confidence: "high",
      },
      {
        field: "breathlessness",
        originalAnswer: "yes",
        normalizedValue: "yes",
        source: "PATIENT",
        language: "en",
        timestamp: new Date(Date.now() - 23 * 60 * 1000).toISOString(),
        confidence: "high",
      },
    ],
    safetyFlags: [
      {
        id: "breathing-difficulty",
        severity: "urgent",
        title: "Breathing difficulty reported",
        explanation: "Potential emergency symptom: immediate clinical triage is recommended.",
        field: "breathingDifficulty",
        triggeredAt: new Date(Date.now() - 23 * 60 * 1000).toISOString(),
      },
    ],
    documents: [],
    backgroundHistory: {
      pastMedical: "Type 2 Diabetes Mellitus (5 yrs)",
      pastSurgical: "None",
      medications: "Metformin 500mg BD",
      allergies: "No known drug allergies",
      family: "Father had hypertension",
      personal: "Non-smoker",
      reviewOfSystems: "Occasional fatigue",
    },
    timeline: [
      {
        id: "tl-1",
        date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
        title: "Symptom Onset",
        detail: "Productive cough and fever started",
        source: "PATIENT",
      },
      {
        id: "tl-2",
        date: new Date(Date.now() - 23 * 60 * 1000).toISOString(),
        title: "Triage Alert",
        detail: "Shortness of breath noted during intake",
        source: "PATIENT",
      },
    ],
    doctorReviews: [],
    ayushHistory: {},
    reviewStatus: "pending",
  },
  {
    id: "DEMO-REC-002",
    submittedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    patientProfile: {
      name: "Sunita Devi",
      age: "36",
      sex: "Female",
      identifier: "DEMO-88219",
      identifierType: "demo",
      language: "hi",
    },
    chiefComplaint: {
      complaintId: "abdominal_pain",
      displayName: "Abdominal Pain",
      originalInput: "pet mein dard ho raha hai do din se",
      confidence: 0.95,
      source: "patient",
    },
    historyAnswers: {
      onsetTime: "2 days ago",
      location: "epigastric",
      onsetPattern: "gradual",
      severity: 6,
      painPattern: "intermittent",
      painQuality: "burning",
      vomiting: "no",
      fever: "no",
      bowelChange: "no_change",
    },
    evidence: [],
    safetyFlags: [],
    documents: [],
    backgroundHistory: {
      pastMedical: "Acid reflux",
      pastSurgical: "None",
      medications: "Antacids PRN",
      allergies: "None",
      family: "Non-contributory",
      personal: "Vegetarian",
      reviewOfSystems: "None",
    },
    timeline: [
      {
        id: "tl-3",
        date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        title: "Abdominal pain started",
        detail: "Gradual burning sensation in upper abdomen",
        source: "PATIENT",
      },
    ],
    doctorReviews: [
      {
        field: "location",
        status: "confirmed",
        reviewedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        reviewer: "Dr. Sharma",
      },
    ],
    ayushHistory: {
      Prakriti: "Pitta-Vata",
      "Ahara Shakti": "Amlapitta tendency, spicy food aggravation",
    },
    reviewStatus: "reviewed",
  },
];

export function getStoredPatientRecords(): StoredPatientRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed initial demo records so prototype queue is immediately testable
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_SEEDS));
      return DEMO_SEEDS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEMO_SEEDS;
  } catch {
    return DEMO_SEEDS;
  }
}

export function savePatientRecord(record: StoredPatientRecord): void {
  try {
    const existing = getStoredPatientRecords();
    const updated = [record, ...existing.filter((r) => r.id !== record.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save patient record:", e);
  }
}

export function updatePatientRecord(
  id: string,
  updates: Partial<StoredPatientRecord>
): StoredPatientRecord | null {
  try {
    const existing = getStoredPatientRecords();
    let found: StoredPatientRecord | null = null;
    const updated = existing.map((r) => {
      if (r.id === id) {
        found = { ...r, ...updates };
        return found;
      }
      return r;
    });
    if (found) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return found;
  } catch (e) {
    console.error("Failed to update patient record:", e);
    return null;
  }
}

export function clearStoredPatientRecords(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
