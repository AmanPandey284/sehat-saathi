/**
 * Duration normalizer.
 *
 * Small, reusable, side-effect-free utility that turns a patient's
 * free-text answer to a "how long have you had this?" style question into
 * a structured number of days. Recognizes English, Hindi (Devanagari), and
 * common Hinglish transliterations.
 *
 * This module has no dependency on React or the question engine — it only
 * reads a string and returns a value, so it can be dropped into any flow
 * that needs a duration without touching engine or UI code.
 */

export type DurationConfidence = "high" | "low";

export interface NormalizedDuration {
  /** Best-effort number of days, or null when the answer isn't understood. */
  normalizedDays: number | null;
  /** The patient's original wording, kept for provenance. */
  originalAnswer: string;
  /** "high" when confidently parsed, "low" when normalizedDays is null. */
  confidence: DurationConfidence;
}

/** Number words this parser understands, English and common Hinglish. */
const NUMBER_WORDS: Record<string, number> = {
  // English
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
  a: 1,
  an: 1,
  // Hinglish
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

/** Unit words mapped to how many days one of that unit is. */
const UNIT_WORDS: Record<string, number> = {
  // English
  day: 1,
  days: 1,
  week: 7,
  weeks: 7,
  month: 30,
  months: 30,
  // Hinglish
  din: 1,
  dinn: 1,
  hafta: 7,
  hafte: 7,
  haftey: 7,
  mahina: 30,
  mahine: 30,
  maheena: 30,
  // Hindi (Devanagari)
  दिन: 1,
  हफ्ता: 7,
  हफ्ते: 7,
  सप्ताह: 7,
  महीना: 30,
  महीने: 30,
};

/**
 * Lowercases, trims, and collapses whitespace so casing/spacing/punctuation
 * differences don't affect matching. Devanagari characters pass through
 * unaffected by lowercasing.
 */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Handles fixed idioms that don't follow the "<number> <unit>" shape, e.g.
 * "since yesterday" or "about a week". Checked before the general
 * number+unit parser since they're more specific.
 */
const FIXED_PHRASES: Array<{ days: number; phrases: string[] }> = [
  {
    days: 1,
    phrases: [
      "since yesterday",
      "yesterday",
      "kal se",
      "kal se hi",
      "कल से",
    ],
  },
  {
    days: 0,
    phrases: ["today", "since today", "aaj se", "आज से"],
  },
  {
    days: 7,
    phrases: [
      "about a week",
      "a week or so",
      "roughly a week",
      "around a week",
      "ek hafta",
      "ek hafte se",
      "एक हफ्ते से",
      "एक हफ्ता",
    ],
  },
  {
    days: 14,
    phrases: ["about two weeks", "a couple of weeks", "around two weeks"],
  },
  {
    days: 30,
    phrases: ["about a month", "roughly a month", "around a month", "ek mahina"],
  },
];

/**
 * Extracts a leading numeral or number word from the start of the
 * (already-normalized) text, returning the numeric value and how many
 * characters of the string it consumed, or null if none is found.
 */
function extractLeadingNumber(
  text: string
): { value: number; rest: string } | null {
  const digitMatch = text.match(/^(\d+(?:\.\d+)?)\s*/);
  if (digitMatch) {
    return { value: parseFloat(digitMatch[1]), rest: text.slice(digitMatch[0].length) };
  }

  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    const pattern = new RegExp(`^${word}(?:[^\\p{L}]|$)`, "u");
    const match = text.match(pattern);
    if (match) {
      const consumed = word.length;
      return { value, rest: text.slice(consumed).trimStart() };
    }
  }

  return null;
}

/**
 * Finds the first unit word appearing anywhere in the (remaining) text and
 * returns its day multiplier, or null if no known unit is present.
 */
function findUnit(text: string): number | null {
  for (const [word, days] of Object.entries(UNIT_WORDS)) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, "u");
    if (pattern.test(` ${text} `)) {
      return days;
    }
  }
  return null;
}

/**
 * Converts a patient's free-text duration answer into a normalized number
 * of days, while preserving the original wording for provenance.
 *
 * Never guesses: if the text can't be confidently mapped to a number of
 * days, `normalizedDays` is `null` and `confidence` is `"low"`.
 */
export function normalizeDuration(rawAnswer: string): NormalizedDuration {
  const normalized = normalize(rawAnswer);

  if (normalized.length === 0) {
    return { normalizedDays: null, originalAnswer: rawAnswer, confidence: "low" };
  }

  // Fixed idioms first — most specific, least likely to false-match.
  for (const { days, phrases } of FIXED_PHRASES) {
    if (phrases.some((phrase) => normalized.includes(phrase))) {
      return { normalizedDays: days, originalAnswer: rawAnswer, confidence: "high" };
    }
  }

  // General "<number> <unit>" parsing, e.g. "3 days", "three days",
  // "3 din se", "तीन दिन से".
  const leading = extractLeadingNumber(normalized);
  if (leading) {
    const unitDays = findUnit(leading.rest);
    if (unitDays !== null) {
      return {
        normalizedDays: Math.round(leading.value * unitDays),
        originalAnswer: rawAnswer,
        confidence: "high",
      };
    }
  }

  // Number word may not be at the very start (e.g. trailing "se"/"से"
  // already stripped, but also handle number appearing after a unit-free
  // prefix isn't supported — kept intentionally conservative per the
  // "never guess" requirement).
  return { normalizedDays: null, originalAnswer: rawAnswer, confidence: "low" };
}
