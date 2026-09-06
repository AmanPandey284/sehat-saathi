import type { AdaptiveConcept } from "./adaptiveQuestionBank";

interface ConceptMatch {
  concept: AdaptiveConcept;
  confidence: number;
  matchedTerms: string[];
}

const conceptPatterns: Record<
  Exclude<AdaptiveConcept, "unknown">,
  string[]
> = {
  headache: [
    "headache",
    "head pain",
    "migraine",
    "sar dard",
    "sir dard",
    "सिर दर्द",
    "आधा सिर",
  ],

  abdominal_pain: [
    "stomach pain",
    "abdominal pain",
    "belly pain",
    "stomach ache",
    "pet dard",
    "pet mein dard",
    "पेट दर्द",
    "पेट में दर्द",
    "acidity",
    "gastric",
    "burning in stomach",
  ],

  chest_pain: [
    "chest pain",
    "pain in chest",
    "seene mein dard",
    "seene me dard",
    "सीने में दर्द",
    "chest tightness",
    "chest pressure",
  ],

  breathing: [
    "difficulty breathing",
    "breathing difficulty",
    "shortness of breath",
    "breathlessness",
    "can't breathe",
    "cannot breathe",
    "saans lene mein dikkat",
    "saans ki dikkat",
    "सांस लेने में दिक्कत",
  ],

  fever: [
    "fever",
    "bukhar",
    "बुखार",
    "high temperature",
    "temperature",
  ],

  cough: [
    "cough",
    "khansi",
    "खांसी",
    "coughing",
  ],

  vomiting: [
    "vomiting",
    "vomit",
    "throwing up",
    "nausea",
    "feeling sick",
    "ulti",
    "उल्टी",
    "जी मिचलाना",
  ],

  diarrhea: [
    "diarrhea",
    "diarrhoea",
    "loose motion",
    "loose motions",
    "loose stool",
    "dast",
    "दस्त",
    "पतले दस्त",
  ],

  dizziness: [
    "dizziness",
    "dizzy",
    "lightheaded",
    "giddiness",
    "chakkar",
    "चक्कर",
  ],

  rash: [
    "rash",
    "skin rash",
    "red spots",
    "itchy spots",
    "daane",
    "दाने",
    "खुजली",
  ],

  urinary: [
    "urine pain",
    "pain while urinating",
    "burning urine",
    "burning while urinating",
    "frequent urination",
    "urine infection",
    "uti",
    "peshab mein jalan",
    "पेशाब में जलन",
  ],

  joint_pain: [
    "joint pain",
    "knee pain",
    "knee ache",
    "shoulder pain",
    "elbow pain",
    "ankle pain",
    "ghutne mein dard",
    "जोड़ों में दर्द",
    "घुटने में दर्द",
  ],

  back_pain: [
    "back pain",
    "lower back pain",
    "backache",
    "kamar dard",
    "कमर दर्द",
    "पीठ दर्द",
  ],

  weakness: [
    "weakness",
    "weak",
    "very tired",
    "fatigue",
    "thakaan",
    "kamzori",
    "थकान",
    "कमजोरी",
  ],

  swelling: [
    "swelling",
    "swollen",
    "sujan",
    "सूजन",
  ],

  bleeding: [
    "blood",
    "bleeding",
    "blood in stool",
    "blood in vomit",
    "blood while coughing",
    "khoon",
    "खून",
  ],

  pain: [
    "pain",
    "ache",
    "dard",
    "दर्द",
  ],
};

export function detectAdaptiveConcepts(text: string): ConceptMatch[] {
  const normalized = text.toLowerCase();

  const matches: ConceptMatch[] = [];

  for (const [concept, terms] of Object.entries(conceptPatterns)) {
    const matchedTerms = terms.filter((term) =>
      normalized.includes(term.toLowerCase()),
    );

    if (matchedTerms.length > 0) {
      const confidence = Math.min(
        0.95,
        0.55 + matchedTerms.length * 0.12,
      );

      matches.push({
        concept: concept as AdaptiveConcept,
        confidence,
        matchedTerms,
      });
    }
  }

  // More specific concepts should be preferred over generic "pain".
  if (matches.length > 1) {
    return matches
      .filter(
        (match) =>
          match.concept !== "pain" ||
          !matches.some(
            (other) =>
              other.concept !== "pain" &&
              other.concept !== "unknown",
          ),
      )
      .sort((a, b) => b.confidence - a.confidence);
  }

  return matches;
}