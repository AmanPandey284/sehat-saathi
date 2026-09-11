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
 * `classifyFreeText` / `classifyFromQuickButton` / `classifyRouted` and
 * reads the result.
 *
 * Routing priority enforced by the UI:
 *   1. detectUrgentComplaintText()  — safety gate, always first
 *   2. classifyFreeText()           — abdominal pain, fever, cough
 *   3. classifyRouted()             — 6 new body-system categories
 *   4. adaptive analysis overlay
 *   5. "custom" fallback
 */

/**
 * All recognised complaint identifiers.
 *
 * The three original supported complaints remain unchanged.
 * The six new routable complaints are added here so the type system
 * covers them; they do NOT appear in SUPPORTED_COMPLAINTS, which controls
 * the quick-select button row.
 */
export type ComplaintId =
  | "abdominal_pain"
  | "fever"
  | "cough"
  | "eye_problems"
  | "headache"
  | "back_pain"
  | "skin_problems"
  | "joint_pain"
  | "urinary_problems"
  | "custom";

/**
 * Controls the quick-select button row in the UI.
 * The six new routable complaints are deliberately NOT included here
 * so the quick-select UI remains unchanged.
 */
export const SUPPORTED_COMPLAINTS: Array<"abdominal_pain" | "fever" | "cough"> = [
  "abdominal_pain",
  "fever",
  "cough",
];

/**
 * The six new body-system categories that classifyRouted() can return.
 * Kept separate from SUPPORTED_COMPLAINTS to avoid touching the UI.
 */
export const ROUTABLE_COMPLAINTS: Array<
  "eye_problems" | "headache" | "back_pain" | "skin_problems" | "joint_pain" | "urinary_problems"
> = [
  "eye_problems",
  "headache",
  "back_pain",
  "skin_problems",
  "joint_pain",
  "urinary_problems",
];

export const COMPLAINT_DISPLAY_NAMES: Record<ComplaintId, string> = {
  abdominal_pain: "Abdominal Pain",
  fever: "Fever",
  cough: "Cough",
  eye_problems: "Eye Problems",
  headache: "Headache",
  back_pain: "Back Pain",
  skin_problems: "Skin Problems",
  joint_pain: "Joint Pain",
  urinary_problems: "Urinary Problems",
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
const KEYWORDS: Record<"abdominal_pain" | "fever" | "cough" | "custom", string[]> = {
  abdominal_pain: [
    "abdominal pain",
    "abdomen pain",
    "stomach pain",
    "stomach ache",
    "stomachache",
    "stomach is hurting",
    "stomach hurting",
    "my stomach hurts",
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
 * Routing keyword table for the six new body-system categories.
 *
 * Rules (same philosophy as KEYWORDS above):
 * - Prefer specific multi-word phrases over single generic words.
 * - Single generic words like "pain" or "ache" alone must NOT appear here
 *   because they would false-match unrelated complaints.
 * - Covers English, Hindi (Devanagari), and common Hinglish transliterations.
 */
const ROUTING_KEYWORDS: Record<
  "eye_problems" | "headache" | "back_pain" | "skin_problems" | "joint_pain" | "urinary_problems",
  string[]
> = {
  eye_problems: [
    // English
    "eye pain",
    "eye ache",
    "eyes hurt",
    "eyes hurting",
    "eyes are hurting",
    "my eyes hurt",
    "my eyes are hurting",
    "eye problem",
    "eye problems",
    "eye issue",
    "red eye",
    "red eyes",
    "eye redness",
    "eye discharge",
    "eye watering",
    "watery eye",
    "watery eyes",
    "blurry vision",
    "blurred vision",
    "vision problem",
    "vision problems",
    "vision loss",
    "cannot see clearly",
    "can't see clearly",
    "itchy eye",
    "itchy eyes",
    "eye infection",
    "something in my eye",
    "foreign body in eye",
    "eye injury",
    // Hindi (Devanagari)
    "आँख में दर्द",
    "आंख में दर्द",
    "आँख में तकलीफ",
    "आँखें लाल",
    "आँख से पानी",
    "धुंधला दिखना",
    "आँख में कुछ गया",
    // Hinglish
    "aankh mein dard",
    "aankh me dard",
    "aankh mein takleef",
    "aankhein lal",
    "aankh se paani",
    "dhundhla dikhna",
    "aankh dukh rahi",
    "aankh dard",
    "aankhon mein dard",
  ],

  headache: [
    // English
    "headache",
    "head pain",
    "head ache",
    "migraine",
    "pain in my head",
    "pain in the head",
    "my head hurts",
    "my head is hurting",
    "head is pounding",
    "throbbing head",
    "pounding headache",
    "splitting headache",
    "temple pain",
    "forehead pain",
    // Hindi (Devanagari)
    "सिर दर्द",
    "सिरदर्द",
    "माथे में दर्द",
    "आधासीसी",
    // Hinglish
    "sar dard",
    "sir dard",
    "sir me dard",
    "sar me dard",
    "sar mein dard",
    "sir mein dard",
    "matha dard",
    "matha dukh raha",
    "adhakpari",
  ],

  back_pain: [
    // English
    "back pain",
    "back ache",
    "backache",
    "lower back pain",
    "upper back pain",
    "mid back pain",
    "spine pain",
    "lumbar pain",
    "my back hurts",
    "my back is hurting",
    "pain in my back",
    "pain in the back",
    // Hindi (Devanagari)
    "कमर दर्द",
    "पीठ दर्द",
    "पीठ में दर्द",
    "कमर में दर्द",
    "रीढ़ में दर्द",
    // Hinglish
    "kamar dard",
    "kamar me dard",
    "kamar mein dard",
    "peeth dard",
    "peeth me dard",
    "peeth mein dard",
    "pith dard",
    "kamar dukh rahi",
    "peeth dukh rahi",
  ],

  skin_problems: [
    // English
    "skin rash",
    "rash on skin",
    "skin problem",
    "skin problems",
    "skin issue",
    "itchy skin",
    "itching skin",
    "skin itching",
    "skin irritation",
    "skin infection",
    "skin lesion",
    "blisters on skin",
    "spots on skin",
    "patches on skin",
    "redness on skin",
    "hives",
    "eczema",
    "dry skin",
    "peeling skin",
    "skin redness",
    "red patches",
    // Hindi (Devanagari)
    "त्वचा पर दाने",
    "त्वचा की समस्या",
    "खुजली",
    "चकत्ते",
    "दाने निकले",
    "चमड़ी पर दाग",
    // Hinglish
    "skin pe daane",
    "daane nikal rahe",
    "daane nikle",
    "skin pe lal daag",
    "khujli ho rahi",
    "khujli ho rahi hai",
    "charme par daane",
    "twach mein kharish",
  ],

  joint_pain: [
    // English
    "joint pain",
    "joint ache",
    "joints hurt",
    "joints hurting",
    "knee pain",
    "knee ache",
    "my knee hurts",
    "knee is hurting",
    "knee hurting",
    "shoulder pain",
    "shoulder ache",
    "elbow pain",
    "wrist pain",
    "hip pain",
    "ankle pain",
    "swollen joint",
    "swollen joints",
    "stiff joint",
    "stiff joints",
    "joint stiffness",
    "pain in my knee",
    "pain in my shoulder",
    "pain in my joints",
    // Hindi (Devanagari)
    "जोड़ों में दर्द",
    "जोड़ में दर्द",
    "घुटने में दर्द",
    "कंधे में दर्द",
    "कोहनी में दर्द",
    "कमर के जोड़ में दर्द",
    // Hinglish
    "jodon mein dard",
    "jodo me dard",
    "ghutne mein dard",
    "ghutne me dard",
    "kandhe mein dard",
    "kohni mein dard",
    "jodon mein sujan",
    "ghutna dukh raha",
  ],

  urinary_problems: [
    // English
    "urine pain",
    "urine burning",
    "burning urine",
    "burning when urinating",
    "burning while urinating",
    "pain when urinating",
    "pain while urinating",
    "pain on urination",
    "frequent urination",
    "urinary problem",
    "urinary problems",
    "urinary issue",
    "urinary infection",
    "urine infection",
    "uti",
    "blood in urine",
    "blood in my urine",
    "difficulty urinating",
    "trouble urinating",
    "cannot urinate",
    "can't urinate",
    "urge to urinate",
    "passing urine often",
    // Hindi (Devanagari)
    "पेशाब में जलन",
    "पेशाब में दर्द",
    "पेशाब की समस्या",
    "बार बार पेशाब",
    "पेशाब में खून",
    "पेशाब रुक रुक कर",
    // Hinglish
    "peshab mein jalan",
    "peshab me jalan",
    "peshab mein dard",
    "peshab me dard",
    "bar bar peshab",
    "peshab mein khoon",
    "peshab ki takleef",
    "urine mein jalan",
    "peshab karte waqt jalan",
  ],
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
 *
 * This function is UNCHANGED from the original implementation.
 * It only covers abdominal_pain, fever, and cough.
 */
export function classifyFreeText(rawInput: string): ComplaintClassification {
  const normalized = normalize(rawInput);

  let bestComplaint: "abdominal_pain" | "fever" | "cough" | null = null;
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
 * Classifies free-text into one of the six new body-system categories.
 *
 * This function is intentionally separate from classifyFreeText() so that
 * the routing priority (abdominal/fever/cough first, then these six) is
 * enforced in the caller, not here.
 *
 * Returns null when nothing in the input positively matches any of the six
 * categories — it does NOT guess. Vague words such as "pain" alone do not
 * trigger a match.
 */
export function classifyRouted(rawInput: string): ComplaintClassification {
  const normalized = normalize(rawInput);

  let bestComplaint: keyof typeof ROUTING_KEYWORDS | null = null;
  let bestMatches: string[] = [];

  for (const complaintId of ROUTABLE_COMPLAINTS) {
    const matches = ROUTING_KEYWORDS[complaintId].filter((keyword) =>
      normalized.includes(keyword.toLowerCase())
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
