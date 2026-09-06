/**
 * Severity normalizer.
 *
 * Small, reusable, side-effect-free utility that turns a patient's
 * free-text description of pain severity into a structured 0–10 value.
 * Recognizes English, Hindi (Devanagari), and common Hinglish
 * transliterations. This module has no dependency on React or the
 * question engine — it only reads a string and returns a value, so it can
 * be dropped into any flow that needs a severity score without touching
 * engine or UI code.
 */

export type SeverityConfidence = "high" | "medium" | "low";

export interface NormalizedSeverity {
  /** A number from 0–10, or null when the answer isn't reliably understood. */
  normalizedSeverity: number | null;
  /** The patient's original wording, kept for provenance. */
  originalAnswer: string;
  /** "high" for exact numeric answers, "medium" for descriptive words, "low" when null. */
  confidence: SeverityConfidence;
}

/** Whole-word number 0–10, in English, Hinglish, and Hindi (Devanagari). */
const NUMBER_WORDS: Record<string, number> = {
  // English
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  // Hinglish
  shunya: 0,
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  chaar: 4,
  paanch: 5,
  panch: 5,
  chhe: 6,
  che: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,
  dus: 10,
  // Hindi (Devanagari)
  शून्य: 0,
  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पांच: 5,
  पाँच: 5,
  छह: 6,
  छः: 6,
  सात: 7,
  आठ: 8,
  नौ: 9,
  दस: 10,
};

/**
 * Curated descriptive-severity phrases with an explicitly defined numeric
 * mapping. Only phrases listed here are normalized; anything else
 * descriptive but not on this list is treated as ambiguous (never
 * guessed). Values follow a common clinical convention: mild ≈ 2,
 * moderate ≈ 5, severe ≈ 8, very severe/extreme ≈ 9.
 */
const DESCRIPTIVE_SEVERITY: Array<{ value: number; phrases: string[] }> = [
  {
    value: 2,
    phrases: [
      "mild",
      "slight",
      "minor",
      "halka",
      "halka dard",
      "thoda dard",
      "हल्का",
      "हल्का दर्द",
      "थोड़ा दर्द",
    ],
  },
  {
    value: 5,
    phrases: ["moderate", "medium", "madhyam", "मध्यम"],
  },
  // Checked before the plain "severe" group below, since "very severe"
  // contains "severe" as a substring — the more specific phrase must win.
  {
    value: 9,
    phrases: [
      "very severe",
      "extreme",
      "unbearable",
      "bahut tez",
      "बहुत तेज़",
      "बहुत तेज",
    ],
  },
  {
    value: 8,
    phrases: [
      "severe",
      "intense",
      "zyada dard",
      "bahut dard",
      "ज़्यादा दर्द",
      "बहुत दर्द",
    ],
  },
];

/**
 * Lowercases, trims, and collapses whitespace so casing/spacing
 * differences don't affect matching. Strips sentence punctuation but
 * deliberately keeps "/" intact, since it's meaningful in "8/10".
 * Devanagari characters pass through unaffected by lowercasing.
 */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts a numeric severity from an already-normalized string, if it
 * matches one of the supported explicit numeric shapes: "8/10",
 * "8 out of 10", or a bare number like "8". Returns the raw parsed
 * number (which may be out of the valid 0–10 range) or null if no
 * numeric shape matched at all.
 */
function extractNumericSeverity(normalized: string): number | null {
  const overTen =
    normalized.match(/^(\d+(?:\.\d+)?)\s*\/\s*10$/) ??
    normalized.match(/^(\d+(?:\.\d+)?)\s*out of\s*10$/);
  if (overTen) return parseFloat(overTen[1]);

  const bareNumber = normalized.match(/^(\d+(?:\.\d+)?)$/);
  if (bareNumber) return parseFloat(bareNumber[1]);

  return null;
}

/**
 * Converts a patient's free-text severity answer into a normalized 0–10
 * value, while preserving the original wording for provenance.
 *
 * Never invents a value: an out-of-range number, an unrecognized
 * description, or empty input all resolve to `normalizedSeverity: null`
 * with `confidence: "low"`.
 */
export function normalizeSeverity(rawAnswer: string): NormalizedSeverity {
  const normalized = normalize(rawAnswer);

  if (normalized.length === 0) {
    return { normalizedSeverity: null, originalAnswer: rawAnswer, confidence: "low" };
  }

  const numeric = extractNumericSeverity(normalized);
  if (numeric !== null) {
    if (numeric >= 0 && numeric <= 10) {
      return { normalizedSeverity: numeric, originalAnswer: rawAnswer, confidence: "high" };
    }
    // Out-of-range numeric answer (e.g. "15", "11/10") — never clamp or
    // invent a value; report as unrecognized instead.
    return { normalizedSeverity: null, originalAnswer: rawAnswer, confidence: "low" };
  }

  if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS, normalized)) {
    return {
      normalizedSeverity: NUMBER_WORDS[normalized],
      originalAnswer: rawAnswer,
      confidence: "high",
    };
  }

  for (const { value, phrases } of DESCRIPTIVE_SEVERITY) {
    if (phrases.some((phrase) => normalized.includes(phrase))) {
      return { normalizedSeverity: value, originalAnswer: rawAnswer, confidence: "medium" };
    }
  }

  return { normalizedSeverity: null, originalAnswer: rawAnswer, confidence: "low" };
}
