/**
 * Fever question flow (Milestone 4C).
 *
 * Pure data — a `QuestionFlow` built with the Milestone 4A question engine's
 * types, following the same conventions as `abdominalPainFlow`:
 * - Tri-state clinical questions (chills, sweating, cough, etc.) are
 *   modeled as `single_select` yes/no/not_sure, since "not sure" is
 *   clinically distinct from a hard "no".
 * - Known temperature is a single optional free-text field the patient can
 *   leave blank if they don't know it, gated behind "do you know your
 *   temperature?" so it isn't asked when there's nothing to report.
 */

import type { QuestionFlow } from "../types";

export const feverFlow: QuestionFlow = {
  id: "fever",
  name: "Fever history",
  firstQuestionId: "duration",
  questions: {
    // 1. Duration
    duration: {
      id: "duration",
      field: "duration",
      questionEn: "How long have you had the fever?",
      questionHi: "आपको बुखार कब से है?",
      answerType: "text",
      required: true,
      nextQuestionId: "knowsTemperature",
    },

    // 2. Does the patient know their temperature? — yes branches to the
    // actual value, no/not_sure skip straight to fever pattern.
    knowsTemperature: {
      id: "knowsTemperature",
      field: "knowsTemperature",
      questionEn: "Do you know your temperature?",
      questionHi: "क्या आपको अपना तापमान पता है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
      ],
      nextQuestionId: "feverPattern",
      branches: [
        { field: "knowsTemperature", equals: "yes", nextQuestionId: "temperature" },
        { field: "knowsTemperature", equals: "no", nextQuestionId: "feverPattern" },
      ],
    },

    // 3. Known temperature value — only when knowsTemperature = yes.
    temperature: {
      id: "temperature",
      field: "temperature",
      questionEn: "What is/was your temperature?",
      questionHi: "आपका तापमान क्या है/था?",
      answerType: "text",
      required: true,
      nextQuestionId: "feverPattern",
    },

    // 4. Fever pattern
    feverPattern: {
      id: "feverPattern",
      field: "feverPattern",
      questionEn: "How would you describe the fever pattern?",
      questionHi: "बुखार किस तरह से आता है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "continuous", labelEn: "Continuous (stays up all day)", labelHi: "लगातार (पूरे दिन रहता है)" },
        {
          value: "intermittent",
          labelEn: "Intermittent (comes and goes)",
          labelHi: "बीच-बीच में आता है",
        },
        {
          value: "comes_at_specific_time",
          labelEn: "Comes at a specific time of day",
          labelHi: "दिन के किसी खास समय पर आता है",
        },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "chills",
    },

    // 5. Chills
    chills: {
      id: "chills",
      field: "chills",
      questionEn: "Have you had chills or shivering?",
      questionHi: "क्या आपको ठंड लगकर कंपकंपी हुई है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "sweating",
    },

    // 6. Sweating
    sweating: {
      id: "sweating",
      field: "sweating",
      questionEn: "Have you had excessive sweating, especially at night?",
      questionHi: "क्या आपको ज़्यादा पसीना आया है, खासकर रात में?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "cough",
    },

    // 7. Cough — yes/no/not_sure, no further branching here (a full cough
    // work-up belongs to the dedicated cough flow if the patient's chief
    // complaint is actually cough).
    cough: {
      id: "cough",
      field: "cough",
      questionEn: "Do you have a cough along with the fever?",
      questionHi: "क्या बुखार के साथ खांसी भी है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "soreThroat",
    },

    // 8. Sore throat
    soreThroat: {
      id: "soreThroat",
      field: "soreThroat",
      questionEn: "Do you have a sore throat?",
      questionHi: "क्या गले में दर्द है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "breathingDifficulty",
    },

    // 9. Breathing difficulty
    breathingDifficulty: {
      id: "breathingDifficulty",
      field: "breathingDifficulty",
      questionEn: "Do you have any difficulty breathing?",
      questionHi: "क्या आपको सांस लेने में तकलीफ है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "vomiting",
    },

    // 10. Vomiting
    vomiting: {
      id: "vomiting",
      field: "vomiting",
      questionEn: "Have you had vomiting?",
      questionHi: "क्या आपको उल्टी हुई है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "diarrhoea",
    },

    // 11. Diarrhoea
    diarrhoea: {
      id: "diarrhoea",
      field: "diarrhoea",
      questionEn: "Have you had loose motions/diarrhoea?",
      questionHi: "क्या आपको दस्त हुए हैं?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "urinarySymptoms",
    },

    // 12. Urinary symptoms — yes branches to the symptom type, no/not_sure
    // skip straight to rash.
    urinarySymptoms: {
      id: "urinarySymptoms",
      field: "urinarySymptoms",
      questionEn: "Any pain or burning while urinating?",
      questionHi: "क्या पेशाब करते समय दर्द या जलन होती है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "rash",
      branches: [
        { field: "urinarySymptoms", equals: "yes", nextQuestionId: "urinarySymptomType" },
        { field: "urinarySymptoms", equals: "no", nextQuestionId: "rash" },
        { field: "urinarySymptoms", equals: "not_sure", nextQuestionId: "rash" },
      ],
    },

    // 12a. Urinary symptom type — only when urinarySymptoms = yes.
    urinarySymptomType: {
      id: "urinarySymptomType",
      field: "urinarySymptomType",
      questionEn: "What type of urinary symptom is it?",
      questionHi: "पेशाब से जुड़ी समस्या किस प्रकार की है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "burning", labelEn: "Burning", labelHi: "जलन" },
        {
          value: "frequent_urination",
          labelEn: "Frequent urination",
          labelHi: "बार-बार पेशाब आना",
        },
        { value: "blood_in_urine", labelEn: "Blood in urine", labelHi: "पेशाब में खून" },
        { value: "other", labelEn: "Other", labelHi: "अन्य" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "rash",
    },

    // 13. Rash
    rash: {
      id: "rash",
      field: "rash",
      questionEn: "Have you noticed any rash on your skin?",
      questionHi: "क्या आपकी त्वचा पर कोई चकत्ते (rash) दिखे हैं?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "associatedSymptoms",
    },

    // 14. Anything else — free text, optional, ends the flow.
    associatedSymptoms: {
      id: "associatedSymptoms",
      field: "associatedSymptoms",
      questionEn: "Which other symptoms do you have? Select all that apply.",
      questionHi: "आपको और कौन-कौन से लक्षण हैं? सभी लागू विकल्प चुनें।",
      answerType: "multi_select",
      required: false,
      options: [
        { value: "headache", labelEn: "Headache", labelHi: "सिरदर्द" },
        { value: "body_ache", labelEn: "Body ache", labelHi: "शरीर में दर्द" },
        { value: "weakness", labelEn: "Weakness", labelHi: "कमज़ोरी" },
        { value: "nausea", labelEn: "Nausea", labelHi: "जी मिचलाना" },
        { value: "none", labelEn: "None of these", labelHi: "इनमें से कोई नहीं" }
      ],
      nextQuestionId: "additionalNotes",
    },

    additionalNotes: {
      id: "additionalNotes",
      field: "additionalNotes",
      questionEn: "Is there anything else you think the doctor should know?",
      questionHi: "क्या कुछ और है जो आप डॉक्टर को बताना चाहेंगे?",
      answerType: "text",
      required: false,
      nextQuestionId: null,
    },
  },
};
