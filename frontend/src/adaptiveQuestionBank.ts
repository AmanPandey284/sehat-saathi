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
  textHi?: string;
  type: "yes_no" | "text" | "single" | "multi";
  options?: string[];
  optionsHi?: string[];
  concepts: AdaptiveConcept[];
  priority?: number;
}

export const adaptiveQuestionBank: AdaptiveQuestion[] = [
  // HEADACHE
  {
    id: "headache_location",
    text: "Where exactly do you feel the headache?",
    textHi: "आपको सिर में दर्द ठीक कहाँ महसूस होता है?",
    type: "text",
    concepts: ["headache"],
    priority: 1,
  },
  {
    id: "headache_sudden",
    text: "Did the headache start suddenly or become extremely severe very quickly?",
    textHi: "क्या सिरदर्द अचानक शुरू हुआ या बहुत जल्दी बहुत तेज़ हो गया?",
    type: "yes_no",
    concepts: ["headache"],
    priority: 10,
  },
  {
    id: "headache_light",
    text: "Does bright light make the headache worse?",
    textHi: "क्या तेज़ रोशनी से सिरदर्द बढ़ जाता है?",
    type: "yes_no",
    concepts: ["headache"],
    priority: 3,
  },
  {
    id: "headache_nausea",
    text: "Are you experiencing nausea or vomiting along with the headache?",
    textHi: "क्या सिरदर्द के साथ आपको जी मिचलाना या उल्टी हो रही है?",
    type: "yes_no",
    concepts: ["headache", "vomiting"],
    priority: 4,
  },

  // ABDOMINAL PAIN
  {
    id: "abd_location",
    text: "Where exactly in your abdomen do you feel the pain?",
    textHi: "आपको पेट के ठीक किस हिस्से में दर्द महसूस होता है?",
    type: "text",
    concepts: ["abdominal_pain"],
    priority: 1,
  },
  {
    id: "abd_food",
    text: "Does the abdominal pain become worse after eating?",
    textHi: "क्या खाना खाने के बाद पेट का दर्द बढ़ जाता है?",
    type: "yes_no",
    concepts: ["abdominal_pain"],
    priority: 3,
  },
  {
    id: "abd_vomiting",
    text: "Have you experienced vomiting along with the abdominal pain?",
    textHi: "क्या पेट दर्द के साथ आपको उल्टी हुई है?",
    type: "yes_no",
    concepts: ["abdominal_pain", "vomiting"],
    priority: 4,
  },
  {
    id: "abd_blood",
    text: "Have you noticed blood in your vomit or black or bloody stools?",
    textHi: "क्या आपने उल्टी में खून या काला/खूनी मल देखा है?",
    type: "yes_no",
    concepts: ["abdominal_pain", "bleeding"],
    priority: 10,
  },

  // CHEST PAIN
  {
    id: "chest_breathing",
    text: "Are you having difficulty breathing along with the chest pain?",
    textHi: "क्या सीने में दर्द के साथ आपको सांस लेने में तकलीफ हो रही है?",
    type: "yes_no",
    concepts: ["chest_pain", "breathing"],
    priority: 10,
  },
  {
    id: "chest_pressure",
    text: "Does the chest pain feel like pressure, heaviness, or tightness?",
    textHi: "क्या सीने का दर्द दबाव, भारीपन या जकड़न जैसा महसूस होता है?",
    type: "yes_no",
    concepts: ["chest_pain"],
    priority: 8,
  },
  {
    id: "chest_radiation",
    text: "Does the pain spread to your arm, shoulder, back, neck, or jaw?",
    textHi: "क्या दर्द आपके हाथ, कंधे, पीठ, गर्दन या जबड़े तक फैलता है?",
    type: "yes_no",
    concepts: ["chest_pain"],
    priority: 9,
  },

  // BREATHING
  {
    id: "breathing_rest",
    text: "Are you having difficulty breathing even while resting?",
    textHi: "क्या आराम करते समय भी आपको सांस लेने में तकलीफ हो रही है?",
    type: "yes_no",
    concepts: ["breathing"],
    priority: 10,
  },
  {
    id: "breathing_speaking",
    text: "Is your breathing difficulty making it hard for you to speak normally?",
    textHi: "क्या सांस लेने की तकलीफ के कारण आपके लिए सामान्य रूप से बोलना मुश्किल हो रहा है?",
    type: "yes_no",
    concepts: ["breathing"],
    priority: 10,
  },
  {
    id: "breathing_wheeze",
    text: "Are you experiencing wheezing or a whistling sound while breathing?",
    textHi: "क्या सांस लेते समय आपको सीटी जैसी आवाज़ या घरघराहट हो रही है?",
    type: "yes_no",
    concepts: ["breathing"],
    priority: 5,
  },

  // FEVER
  {
    id: "fever_temperature",
    text: "Do you know your temperature?",
    textHi: "क्या आपको अपना तापमान पता है?",
    type: "text",
    concepts: ["fever"],
    priority: 1,
  },
  {
    id: "fever_chills",
    text: "Are you experiencing chills or shivering?",
    textHi: "क्या आपको ठंड लग रही है या कंपकंपी हो रही है?",
    type: "yes_no",
    concepts: ["fever"],
    priority: 3,
  },
  {
    id: "fever_rash",
    text: "Have you developed a rash along with the fever?",
    textHi: "क्या बुखार के साथ आपके शरीर पर दाने निकल आए हैं?",
    type: "yes_no",
    concepts: ["fever", "rash"],
    priority: 6,
  },
  {
    id: "fever_weakness",
    text: "Are you feeling unusually weak or extremely tired?",
    textHi: "क्या आपको सामान्य से अधिक कमजोरी या बहुत ज्यादा थकान महसूस हो रही है?",
    type: "yes_no",
    concepts: ["fever", "weakness"],
    priority: 4,
  },

  // COUGH
  {
    id: "cough_duration",
    text: "How long have you had the cough?",
    textHi: "आपको खांसी कब से है?",
    type: "text",
    concepts: ["cough"],
    priority: 1,
  },
  {
    id: "cough_blood",
    text: "Have you noticed blood when coughing?",
    textHi: "क्या खांसते समय आपने खून देखा है?",
    type: "yes_no",
    concepts: ["cough", "bleeding"],
    priority: 10,
  },
  {
    id: "cough_breathing",
    text: "Are you experiencing difficulty breathing with the cough?",
    textHi: "क्या खांसी के साथ आपको सांस लेने में तकलीफ हो रही है?",
    type: "yes_no",
    concepts: ["cough", "breathing"],
    priority: 10,
  },
  {
    id: "cough_phlegm",
    text: "Are you coughing up mucus or phlegm?",
    textHi: "क्या आपको खांसी के साथ बलगम आ रहा है?",
    type: "yes_no",
    concepts: ["cough"],
    priority: 3,
  },

  // VOMITING
  {
    id: "vomiting_frequency",
    text: "How many times have you vomited recently?",
    textHi: "हाल में आपको कितनी बार उल्टी हुई है?",
    type: "text",
    concepts: ["vomiting"],
    priority: 1,
  },
  {
    id: "vomiting_fluids",
    text: "Are you able to keep water or other fluids down?",
    textHi: "क्या आप पानी या दूसरे तरल पदार्थ पीकर उन्हें रोक पा रहे हैं?",
    type: "yes_no",
    concepts: ["vomiting"],
    priority: 9,
  },
  {
    id: "vomiting_blood",
    text: "Have you noticed blood in your vomit?",
    textHi: "क्या आपने उल्टी में खून देखा है?",
    type: "yes_no",
    concepts: ["vomiting", "bleeding"],
    priority: 10,
  },

  // DIARRHEA
  {
    id: "diarrhea_frequency",
    text: "Approximately how many loose stools have you had today?",
    textHi: "आज आपको लगभग कितनी बार पतला मल हुआ है?",
    type: "text",
    concepts: ["diarrhea"],
    priority: 1,
  },
  {
    id: "diarrhea_blood",
    text: "Have you noticed blood in your stool?",
    textHi: "क्या आपने मल में खून देखा है?",
    type: "yes_no",
    concepts: ["diarrhea", "bleeding"],
    priority: 10,
  },
  {
    id: "diarrhea_fluids",
    text: "Are you able to drink enough fluids?",
    textHi: "क्या आप पर्याप्त मात्रा में तरल पदार्थ पी पा रहे हैं?",
    type: "yes_no",
    concepts: ["diarrhea"],
    priority: 7,
  },
  {
    id: "diarrhea_pain",
    text: "Are you experiencing abdominal pain along with the loose stools?",
    textHi: "क्या पतले दस्त के साथ आपको पेट में दर्द भी हो रहा है?",
    type: "yes_no",
    concepts: ["diarrhea", "abdominal_pain"],
    priority: 4,
  },

  // DIZZINESS
  {
    id: "dizziness_faint",
    text: "Have you actually fainted or lost consciousness?",
    textHi: "क्या आप वास्तव में बेहोश हुए हैं या आपकी चेतना चली गई थी?",
    type: "yes_no",
    concepts: ["dizziness"],
    priority: 10,
  },
  {
    id: "dizziness_standing",
    text: "Does the dizziness become worse when you stand up?",
    textHi: "क्या खड़े होने पर चक्कर अधिक बढ़ जाता है?",
    type: "yes_no",
    concepts: ["dizziness"],
    priority: 4,
  },

  // RASH
  {
    id: "rash_location",
    text: "Where on your body did the rash appear?",
    textHi: "आपके शरीर के किस हिस्से पर दाने निकले हैं?",
    type: "text",
    concepts: ["rash"],
    priority: 1,
  },
  {
    id: "rash_itch",
    text: "Is the rash itchy?",
    textHi: "क्या दानों में खुजली होती है?",
    type: "yes_no",
    concepts: ["rash"],
    priority: 3,
  },
  {
    id: "rash_fever",
    text: "Do you have a fever along with the rash?",
    textHi: "क्या दानों के साथ आपको बुखार भी है?",
    type: "yes_no",
    concepts: ["rash", "fever"],
    priority: 7,
  },

  // URINARY
  {
    id: "urinary_burning",
    text: "Do you have burning or pain when passing urine?",
    textHi: "क्या पेशाब करते समय जलन या दर्द होता है?",
    type: "yes_no",
    concepts: ["urinary"],
    priority: 3,
  },
  {
    id: "urinary_frequency",
    text: "Are you needing to pass urine more frequently than usual?",
    textHi: "क्या आपको सामान्य से अधिक बार पेशाब करने की जरूरत पड़ रही है?",
    type: "yes_no",
    concepts: ["urinary"],
    priority: 3,
  },
  {
    id: "urinary_blood",
    text: "Have you noticed blood in your urine?",
    textHi: "क्या आपने पेशाब में खून देखा है?",
    type: "yes_no",
    concepts: ["urinary", "bleeding"],
    priority: 10,
  },

  // JOINT PAIN
  {
    id: "joint_location",
    text: "Which joint or joints are painful?",
    textHi: "आपके किस जोड़ या किन जोड़ों में दर्द है?",
    type: "text",
    concepts: ["joint_pain"],
    priority: 1,
  },
  {
    id: "joint_swelling",
    text: "Is there swelling around the painful joint?",
    textHi: "क्या दर्द वाले जोड़ के आसपास सूजन है?",
    type: "yes_no",
    concepts: ["joint_pain", "swelling"],
    priority: 5,
  },
  {
    id: "joint_redness",
    text: "Is the joint red or unusually warm?",
    textHi: "क्या जोड़ लाल या सामान्य से ज्यादा गर्म है?",
    type: "yes_no",
    concepts: ["joint_pain"],
    priority: 6,
  },

  // BACK PAIN
  {
    id: "back_location",
    text: "Where exactly is the back pain?",
    textHi: "आपको पीठ में ठीक कहाँ दर्द है?",
    type: "text",
    concepts: ["back_pain"],
    priority: 1,
  },
  {
    id: "back_leg",
    text: "Does the pain travel down into your leg?",
    textHi: "क्या दर्द पैर तक नीचे की ओर फैलता है?",
    type: "yes_no",
    concepts: ["back_pain"],
    priority: 5,
  },
  {
    id: "back_weakness",
    text: "Are you experiencing weakness or numbness in your legs?",
    textHi: "क्या आपके पैरों में कमजोरी या सुन्नपन महसूस हो रहा है?",
    type: "yes_no",
    concepts: ["back_pain", "weakness"],
    priority: 10,
  },

  // GENERAL PAIN
  {
    id: "pain_location",
    text: "Where exactly is the pain?",
    textHi: "आपको दर्द ठीक कहाँ महसूस होता है?",
    type: "text",
    concepts: ["pain"],
    priority: 1,
  },
  {
    id: "pain_severity",
    text: "How severe is the pain?",
    textHi: "दर्द 0 से 10 के पैमाने पर कितना तेज़ है?",
    type: "single",
    options: ["Mild", "Moderate", "Severe", "Very severe"],
    optionsHi: ["हल्का", "मध्यम", "तेज़", "बहुत तेज़"],
    concepts: ["pain"],
    priority: 2,
  },
  {
    id: "pain_onset",
    text: "Did the pain start suddenly or gradually?",
    textHi: "क्या दर्द अचानक शुरू हुआ या धीरे-धीरे?",
    type: "single",
    options: ["Suddenly", "Gradually", "Not sure"],
    optionsHi: ["अचानक", "धीरे-धीरे", "पता नहीं"],
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