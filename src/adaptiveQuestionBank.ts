export type AdaptiveConcept =
  | "headache"
  | "abdominal_pain"
  | "chest_pain"
  | "breathing"
  | "fever"
  | "cough"
  | "vomiting"
  | "diarrhea"
  | "dizziness"
  | "rash"
  | "urinary"
  | "joint_pain"
  | "back_pain"
  | "weakness"
  | "swelling"
  | "bleeding"
  | "pain"
  | "unknown";

export interface AdaptiveQuestion {
  id: string;
  text: string;
  type: "yes_no" | "text" | "single" | "multi";
  options?: string[];
  concepts: AdaptiveConcept[];
  priority?: number;
}

export const adaptiveQuestionBank: AdaptiveQuestion[] = [
  // HEADACHE
  {
    id: "headache_location",
    text: "Where exactly do you feel the headache?",
    type: "text",
    concepts: ["headache"],
    priority: 1,
  },
  {
    id: "headache_sudden",
    text: "Did the headache start suddenly or become extremely severe very quickly?",
    type: "yes_no",
    concepts: ["headache"],
    priority: 10,
  },
  {
    id: "headache_light",
    text: "Does bright light make the headache worse?",
    type: "yes_no",
    concepts: ["headache"],
    priority: 3,
  },
  {
    id: "headache_nausea",
    text: "Are you experiencing nausea or vomiting along with the headache?",
    type: "yes_no",
    concepts: ["headache", "vomiting"],
    priority: 4,
  },

  // ABDOMINAL PAIN
  {
    id: "abd_location",
    text: "Where exactly in your abdomen do you feel the pain?",
    type: "text",
    concepts: ["abdominal_pain"],
    priority: 1,
  },
  {
    id: "abd_food",
    text: "Does the abdominal pain become worse after eating?",
    type: "yes_no",
    concepts: ["abdominal_pain"],
    priority: 3,
  },
  {
    id: "abd_vomiting",
    text: "Have you experienced vomiting along with the abdominal pain?",
    type: "yes_no",
    concepts: ["abdominal_pain", "vomiting"],
    priority: 4,
  },
  {
    id: "abd_blood",
    text: "Have you noticed blood in your vomit or black or bloody stools?",
    type: "yes_no",
    concepts: ["abdominal_pain", "bleeding"],
    priority: 10,
  },

  // CHEST PAIN
  {
    id: "chest_breathing",
    text: "Are you having difficulty breathing along with the chest pain?",
    type: "yes_no",
    concepts: ["chest_pain", "breathing"],
    priority: 10,
  },
  {
    id: "chest_pressure",
    text: "Does the chest pain feel like pressure, heaviness, or tightness?",
    type: "yes_no",
    concepts: ["chest_pain"],
    priority: 8,
  },
  {
    id: "chest_radiation",
    text: "Does the pain spread to your arm, shoulder, back, neck, or jaw?",
    type: "yes_no",
    concepts: ["chest_pain"],
    priority: 9,
  },

  // BREATHING
  {
    id: "breathing_rest",
    text: "Are you having difficulty breathing even while resting?",
    type: "yes_no",
    concepts: ["breathing"],
    priority: 10,
  },
  {
    id: "breathing_speaking",
    text: "Is your breathing difficulty making it hard for you to speak normally?",
    type: "yes_no",
    concepts: ["breathing"],
    priority: 10,
  },
  {
    id: "breathing_wheeze",
    text: "Are you experiencing wheezing or a whistling sound while breathing?",
    type: "yes_no",
    concepts: ["breathing"],
    priority: 5,
  },

  // FEVER
  {
    id: "fever_temperature",
    text: "Do you know your temperature?",
    type: "text",
    concepts: ["fever"],
    priority: 1,
  },
  {
    id: "fever_chills",
    text: "Are you experiencing chills or shivering?",
    type: "yes_no",
    concepts: ["fever"],
    priority: 3,
  },
  {
    id: "fever_rash",
    text: "Have you developed a rash along with the fever?",
    type: "yes_no",
    concepts: ["fever", "rash"],
    priority: 6,
  },
  {
    id: "fever_weakness",
    text: "Are you feeling unusually weak or extremely tired?",
    type: "yes_no",
    concepts: ["fever", "weakness"],
    priority: 4,
  },

  // COUGH
  {
    id: "cough_duration",
    text: "How long have you had the cough?",
    type: "text",
    concepts: ["cough"],
    priority: 1,
  },
  {
    id: "cough_blood",
    text: "Have you noticed blood when coughing?",
    type: "yes_no",
    concepts: ["cough", "bleeding"],
    priority: 10,
  },
  {
    id: "cough_breathing",
    text: "Are you experiencing difficulty breathing with the cough?",
    type: "yes_no",
    concepts: ["cough", "breathing"],
    priority: 10,
  },
  {
    id: "cough_phlegm",
    text: "Are you coughing up mucus or phlegm?",
    type: "yes_no",
    concepts: ["cough"],
    priority: 3,
  },

  // VOMITING
  {
    id: "vomiting_frequency",
    text: "How many times have you vomited recently?",
    type: "text",
    concepts: ["vomiting"],
    priority: 1,
  },
  {
    id: "vomiting_fluids",
    text: "Are you able to keep water or other fluids down?",
    type: "yes_no",
    concepts: ["vomiting"],
    priority: 9,
  },
  {
    id: "vomiting_blood",
    text: "Have you noticed blood in your vomit?",
    type: "yes_no",
    concepts: ["vomiting", "bleeding"],
    priority: 10,
  },

  // DIARRHEA
  {
    id: "diarrhea_frequency",
    text: "Approximately how many loose stools have you had today?",
    type: "text",
    concepts: ["diarrhea"],
    priority: 1,
  },
  {
    id: "diarrhea_blood",
    text: "Have you noticed blood in your stool?",
    type: "yes_no",
    concepts: ["diarrhea", "bleeding"],
    priority: 10,
  },
  {
    id: "diarrhea_fluids",
    text: "Are you able to drink enough fluids?",
    type: "yes_no",
    concepts: ["diarrhea"],
    priority: 7,
  },
  {
    id: "diarrhea_pain",
    text: "Are you experiencing abdominal pain along with the loose stools?",
    type: "yes_no",
    concepts: ["diarrhea", "abdominal_pain"],
    priority: 4,
  },

  // DIZZINESS
  {
    id: "dizziness_faint",
    text: "Have you actually fainted or lost consciousness?",
    type: "yes_no",
    concepts: ["dizziness"],
    priority: 10,
  },
  {
    id: "dizziness_standing",
    text: "Does the dizziness become worse when you stand up?",
    type: "yes_no",
    concepts: ["dizziness"],
    priority: 4,
  },

  // RASH
  {
    id: "rash_location",
    text: "Where on your body did the rash appear?",
    type: "text",
    concepts: ["rash"],
    priority: 1,
  },
  {
    id: "rash_itch",
    text: "Is the rash itchy?",
    type: "yes_no",
    concepts: ["rash"],
    priority: 3,
  },
  {
    id: "rash_fever",
    text: "Do you have a fever along with the rash?",
    type: "yes_no",
    concepts: ["rash", "fever"],
    priority: 7,
  },

  // URINARY
  {
    id: "urinary_burning",
    text: "Do you have burning or pain when passing urine?",
    type: "yes_no",
    concepts: ["urinary"],
    priority: 3,
  },
  {
    id: "urinary_frequency",
    text: "Are you needing to pass urine more frequently than usual?",
    type: "yes_no",
    concepts: ["urinary"],
    priority: 3,
  },
  {
    id: "urinary_blood",
    text: "Have you noticed blood in your urine?",
    type: "yes_no",
    concepts: ["urinary", "bleeding"],
    priority: 10,
  },

  // JOINT PAIN
  {
    id: "joint_location",
    text: "Which joint or joints are painful?",
    type: "text",
    concepts: ["joint_pain"],
    priority: 1,
  },
  {
    id: "joint_swelling",
    text: "Is there swelling around the painful joint?",
    type: "yes_no",
    concepts: ["joint_pain", "swelling"],
    priority: 5,
  },
  {
    id: "joint_redness",
    text: "Is the joint red or unusually warm?",
    type: "yes_no",
    concepts: ["joint_pain"],
    priority: 6,
  },

  // BACK PAIN
  {
    id: "back_location",
    text: "Where exactly is the back pain?",
    type: "text",
    concepts: ["back_pain"],
    priority: 1,
  },
  {
    id: "back_leg",
    text: "Does the pain travel down into your leg?",
    type: "yes_no",
    concepts: ["back_pain"],
    priority: 5,
  },
  {
    id: "back_weakness",
    text: "Are you experiencing weakness or numbness in your legs?",
    type: "yes_no",
    concepts: ["back_pain", "weakness"],
    priority: 10,
  },

  // GENERAL PAIN
  {
    id: "pain_location",
    text: "Where exactly is the pain?",
    type: "text",
    concepts: ["pain"],
    priority: 1,
  },
  {
    id: "pain_severity",
    text: "How severe is the pain?",
    type: "single",
    options: ["Mild", "Moderate", "Severe", "Very severe"],
    concepts: ["pain"],
    priority: 2,
  },
  {
    id: "pain_onset",
    text: "Did the pain start suddenly or gradually?",
    type: "single",
    options: ["Suddenly", "Gradually", "Not sure"],
    concepts: ["pain"],
    priority: 3,
  },
];

export function getQuestionsForConcepts(
  concepts: AdaptiveConcept[],
): AdaptiveQuestion[] {
  const unique = new Map<string, AdaptiveQuestion>();

  for (const question of adaptiveQuestionBank) {
    const matches = question.concepts.some((concept) =>
      concepts.includes(concept),
    );

    if (matches) {
      unique.set(question.id, question);
    }
  }

  return Array.from(unique.values()).sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );
}