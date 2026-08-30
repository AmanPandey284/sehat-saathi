/**
 * Yes/No answer normalizer.
 *
 * Small, reusable, side-effect-free utility that turns a patient's free-text
 * reply to a yes/no style question into one of four normalized values:
 * "yes" | "no" | "not_sure" | "unknown".
 *
 * Recognizes English, Hindi (Devanagari), and common Hinglish
 * transliterations. This module has no dependency on the question engine
 * or any UI component — it only reads a string and returns a value, so it
 * can be dropped into any flow that needs a yes/no answer without touching
 * engine or UI code.
 */

export type NormalizedAnswer = "yes" | "no" | "not_sure" | "unknown";

export interface NormalizedYesNoAnswer {
  normalized: NormalizedAnswer;
  /** The patient's original wording, kept for provenance. */
  originalAnswer: string;
}

/**
 * Keyword table. Values are already lowercase and are checked as substrings
 * of the normalized input. "not_sure" phrases are checked before "yes"/"no"
 * so that a phrase like "not sure" (which contains no yes/no keyword) is
 * never miscategorized, and so ambiguous combined phrases lean toward
 * "not_sure" rather than a false-confident yes/no.
 */
const NOT_SURE_KEYWORDS = [
  "not sure",
  "not really sure",
  "unsure",
  "maybe",
  "perhaps",
  "pata nahi",
  "pata nahin",
  "पता नहीं",
  "पता नही",
];

const YES_KEYWORDS = ["yes", "yeah", "yep", "yup", "ok", "okay", "haan", "han", "हाँ", "हां"];

const NO_KEYWORDS = ["no", "nope", "nahi", "nahin", "नहीं", "नही"];

/**
 * Lowercases, trims, and strips punctuation so "Yes." and "yes" and
 * "Yes!" all match the same way. Devanagari characters are untouched by
 * lowercasing/punctuation stripping, so Hindi input passes through intact.
 */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Converts a patient's free-text yes/no reply into a normalized answer,
 * while preserving the original wording for provenance.
 *
 * Order of checks: not-sure phrases first (most specific / least likely to
 * false-match), then no, then yes. "unknown" is returned whenever nothing
 * in the table matches — this function never guesses.
 */
export function normalizeYesNoAnswer(rawAnswer: string): NormalizedYesNoAnswer {
  const normalized = normalize(rawAnswer);

  if (normalized.length === 0) {
    return { normalized: "unknown", originalAnswer: rawAnswer };
  }

  if (NOT_SURE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return { normalized: "not_sure", originalAnswer: rawAnswer };
  }

  if (NO_KEYWORDS.some((keyword) => matchesWholeWord(normalized, keyword))) {
    return { normalized: "no", originalAnswer: rawAnswer };
  }

  if (YES_KEYWORDS.some((keyword) => matchesWholeWord(normalized, keyword))) {
    return { normalized: "yes", originalAnswer: rawAnswer };
  }

  return { normalized: "unknown", originalAnswer: rawAnswer };
}

/**
 * Whole-word substring match. Plain `.includes()` would let "no" match
 * inside "know" or "not", and "ok" match inside "broken" — this checks
 * that the keyword is bounded by non-letter characters (or string edges)
 * on both sides, for both Latin and Devanagari text.
 */
function matchesWholeWord(haystack: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, "u");
  return pattern.test(` ${haystack} `);
}
