/**
 * Chief-complaint classifier.
 *
 * This is deliberately NOT an LLM call. Milestone 3 requires a controlled,
 * explainable classifier: a small keyword table mapping patient phrasing
 * (English, Hindi, and common Hinglish transliterations) to one of the
 * three supported complaints.
 *
 * This module has no dependency on React or routing, so it can be unit
 * tested in isolation and swapped for a real NLU service later without
 * touching any UI component — the UI only ever calls
 * `classifyFreeText` / `classifyFromQuickButton` and reads the result.
 */

export type ComplaintId = "abdominal_pain" | "fever" | "cough" | "custom";

export const SUPPORTED_COMPLAINTS: Array<Exclude<ComplaintId, "custom">> = [
  "abdominal_pain",
  "fever",
  "cough",
];

export const COMPLAINT_DISPLAY_NAMES: Record<ComplaintId, string> = {
  abdominal_pain: "Abdominal Pain",
  fever: "Fever",
  cough: "Cough",
  custom: "Other / custom complaint",
};

export type ClassificationSource = "quick_button" | "free_text";

export interface ComplaintClassification {
  complaintId: ComplaintId | null;
  displayName: string | null;
  /** 0 when nothing matched, otherwise how confident the keyword match is. */
  confidence: number;
  matchedKeywords: string[];
  source: ClassificationSource;
  /** The patient's original wording, kept for provenance even after normalization. */
  originalInput: string;
}

/**
 * Keyword table. Keys are the supported complaints; values are phrases
 * (already lowercase) checked as substrings of the normalized input.
 * Deliberately specific multi-word phrases (e.g. "stomach pain", not just
 * "pain") so unrelated complaints like "back pain" or "my eyes hurt" don't
 * false-match.
 */
const KEYWORDS: Record<ComplaintId, string[]> = {
  abdominal_pain: [
    "abdominal pain",
    "abdomen pain",
    "stomach pain",
    "stomach ache",
    "stomachache",
    "belly pain",
    "belly ache",
    "bellyache",
    "tummy pain",
    "tummy ache",
    "pet mein dard",
    "pet me dard",
    "pet dard",
  ],
  fever: ["fever", "high temperature", "high fever", "bukhar", "bukhaar"],
  cough: ["cough", "coughing", "khansi", "khaansi", "kasi"],
  custom: []
};

/**
 * Lowercases, trims, and strips punctuation so "I have stomach pain." and
 * "stomach pain" match the same way.
 */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Classifies free-text patient input into one of the supported complaints.
 * Returns a null complaintId (confidence 0) rather than guessing when
 * nothing matches confidently — per the Milestone 3 "do not guess" rule.
 */
export function classifyFreeText(rawInput: string): ComplaintClassification {
  const normalized = normalize(rawInput);

  let bestComplaint: ComplaintId | null = null;
  let bestMatches: string[] = [];

  for (const complaintId of SUPPORTED_COMPLAINTS) {
    const matches = KEYWORDS[complaintId].filter((keyword) =>
      normalized.includes(keyword)
    );

    if (matches.length > bestMatches.length) {
      bestComplaint = complaintId;
      bestMatches = matches;
    }
  }

  if (!bestComplaint || bestMatches.length === 0) {
    return {
      complaintId: null,
      displayName: null,
      confidence: 0,
      matchedKeywords: [],
      source: "free_text",
      originalInput: rawInput,
    };
  }

  // Deterministic confidence: one keyword hit is a solid match; more than
  // one reinforcing phrase pushes it higher. This is intentionally simple
  // and explainable, not a learned probability.
  const confidence = bestMatches.length >= 2 ? 0.97 : 0.9;

  return {
    complaintId: bestComplaint,
    displayName: COMPLAINT_DISPLAY_NAMES[bestComplaint],
    confidence,
    matchedKeywords: bestMatches,
    source: "free_text",
    originalInput: rawInput,
  };
}

/**
 * Used when the patient taps one of the quick-select complaint buttons —
 * always full confidence since there's no ambiguity to resolve.
 */
export function classifyFromQuickButton(
  complaintId: ComplaintId
): ComplaintClassification {
  return {
    complaintId,
    displayName: COMPLAINT_DISPLAY_NAMES[complaintId],
    confidence: 1,
    matchedKeywords: [],
    source: "quick_button",
    originalInput: COMPLAINT_DISPLAY_NAMES[complaintId],
  };
}
