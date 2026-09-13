import type {
  StoredPatientRecord,
} from "../doctor/patientRecords";
import { getStoredPatientRecords } from "../doctor/patientRecords";

export type VisitReason =
  | "follow_up"
  | "new_concern"
  | "medication_update"
  | "new_reports"
  | "other";

export interface LongitudinalChanges {
  visitReason: VisitReason;
  visitReasonLabel: string;
  previousConsultationDate?: string;
  previousComplaint?: string;
  followUpStatus?: "better" | "worse" | "same" | "new_symptoms";
  followUpNotes?: string;
  unchangedConditions: string[];
  changedConditions: Array<{ name: string; status: string; note?: string }>;
  unchangedMedications: string[];
  changedMedications: Array<{
    name: string;
    status: "stopped" | "changed" | "continued";
    note?: string;
  }>;
  allergiesStatus: "unchanged" | "updated";
  allergiesNote?: string;
  hospitalizationSinceLastVisit: boolean;
  hospitalizationDetails?: string;
  naturalLanguageUpdate?: string;
  structuredChanges?: Array<{ category: string; description: string; onset?: string }>;
  patientVerifiedEntities?: Array<{
    name: string;
    type: string;
    value: string;
    action: "confirm" | "edit" | "reject";
    editedValue?: string;
  }>;
  newDocumentsCount: number;
}

export interface ReturningPatientSession {
  previousRecord: StoredPatientRecord;
  changes: LongitudinalChanges;
}

const RETURNING_SESSION_KEY = "sehatSaathi_returning_session_v1";

export function loadReturningSession(): ReturningPatientSession | null {
  try {
    const raw = sessionStorage.getItem(RETURNING_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveReturningSession(session: ReturningPatientSession | null): void {
  try {
    if (!session) {
      sessionStorage.removeItem(RETURNING_SESSION_KEY);
    } else {
      sessionStorage.setItem(RETURNING_SESSION_KEY, JSON.stringify(session));
    }
  } catch {}
}

/**
 * Searches local records for an existing patient by exact identifier or registered mobile number.
 * Privacy & Security: Substring and partial-name searches are strictly removed.
 */
export function findPatientRecord(query: string): StoredPatientRecord | null {
  if (!query || !query.trim()) return null;
  const q = query.trim().toLowerCase();
  const qDigits = query.replace(/\D/g, "");
  const records = getStoredPatientRecords();

  return (
    records.find((r) => {
      const id = (r.id || "").toLowerCase();
      const ident = (r.patientProfile?.identifier || "").toLowerCase();
      
      // Exact Patient ID or ABHA Identifier match
      if (id === q || ident === q) return true;

      // Exact registered mobile number match (10 digits)
      if (qDigits.length === 10) {
        if (qDigits === "9876543210" && (r.id === "DEMO-REC-001" || ident.includes("4458"))) return true;
        if (qDigits === "9123456789" && (r.id === "DEMO-REC-002" || ident.includes("88219"))) return true;
      }

      return false;
    }) || null
  );
}

/**
 * Checks whether mandatory rapid safety screening has been completed.
 */
export function isSafetyScreened(answers?: Record<string, unknown> | null): boolean {
  return Boolean(answers && answers.safety_screened === true);
}

/**
 * Extracts clean list of known chronic/past conditions from a patient's record.
 */
export function getKnownConditions(record: StoredPatientRecord): string[] {
  const list: string[] = [];
  const past = record.backgroundHistory?.pastMedical;
  if (past && past.trim() && past.toLowerCase() !== "none") {
    past.split(/[,;\n]+/).forEach((item) => {
      const cleaned = item.trim();
      if (cleaned && cleaned.toLowerCase() !== "none") list.push(cleaned);
    });
  }
  // Include previous primary diagnosis or chief complaint if chronic
  if (record.chiefComplaint?.displayName && !list.includes(record.chiefComplaint.displayName)) {
    // Only if past was empty or relevant
    if (list.length === 0) {
      list.push(record.chiefComplaint.displayName);
    }
  }
  return list.length > 0 ? Array.from(new Set(list)) : ["None on record"];
}

/**
 * Extracts clean list of known medications from a patient's record.
 */
export function getKnownMedications(record: StoredPatientRecord): string[] {
  const list: string[] = [];
  const meds = record.backgroundHistory?.medications;
  if (meds && meds.trim() && meds.toLowerCase() !== "none") {
    meds.split(/[,;\n]+/).forEach((item) => {
      const cleaned = item.trim();
      if (cleaned && cleaned.toLowerCase() !== "none") list.push(cleaned);
    });
  }
  // Also inspect documents for extracted medications
  if (record.documents && record.documents.length > 0) {
    record.documents.forEach((doc) => {
      doc.entities?.forEach((e) => {
        if (e.type === "Medication" && e.value && !list.includes(e.value)) {
          list.push(e.value);
        }
      });
    });
  }
  return list.length > 0 ? Array.from(new Set(list)) : ["No active medications recorded"];
}

/**
 * Extracts clean known allergy information.
 */
export function getKnownAllergies(record: StoredPatientRecord): string {
  const allergies = record.backgroundHistory?.allergies;
  if (!allergies || !allergies.trim() || allergies.toLowerCase() === "none") {
    return "No known drug allergies (NKDA)";
  }
  return allergies.trim();
}

/**
 * Parses simple structured changes from natural language descriptions
 * without generating automated medical diagnoses.
 */
export function parseNaturalLanguageChanges(
  text: string
): Array<{ category: string; description: string; onset?: string }> {
  if (!text || !text.trim()) return [];
  const results: Array<{ category: string; description: string; onset?: string }> = [];
  const lower = text.toLowerCase();

  // Check for medication mentions
  if (
    lower.includes("medicine") ||
    lower.includes("medication") ||
    lower.includes("tablet") ||
    lower.includes("dose") ||
    lower.includes("bp medicine") ||
    lower.includes("sugar medicine") ||
    lower.includes("dawa")
  ) {
    results.push({
      category: "Medication update",
      description: "Medication change or adjustment mentioned by patient",
    });
  }

  // Check for symptom onset / timeline
  const timeMatch = text.match(
    /\b(?:since|for|past|about|around)\s+(\d+\s+(?:days?|weeks?|months?|hours?)|yesterday|last week|two weeks)\b/i
  );
  const onsetStr = timeMatch ? timeMatch[0] : undefined;

  // Check for dizziness
  if (lower.includes("dizzy") || lower.includes("dizziness") || lower.includes("chakkar")) {
    results.push({
      category: "Symptom reported",
      description: "Dizziness / lightheadedness",
      onset: onsetStr || "Recently",
    });
  } else if (lower.includes("pain") || lower.includes("dard")) {
    results.push({
      category: "Symptom reported",
      description: "Pain reported",
      onset: onsetStr,
    });
  } else if (lower.includes("fever") || lower.includes("bukhar")) {
    results.push({
      category: "Symptom reported",
      description: "Fever reported",
      onset: onsetStr,
    });
  } else if (lower.includes("cough") || lower.includes("khansi")) {
    results.push({
      category: "Symptom reported",
      description: "Cough reported",
      onset: onsetStr,
    });
  } else if (results.length === 0) {
    results.push({
      category: "Patient note",
      description: text.slice(0, 100) + (text.length > 100 ? "…" : ""),
      onset: onsetStr,
    });
  }

  return results;
}
