import type { QuestionFlow } from "../types";

/**
 * Eye Problems — structured history-taking flow.
 *
 * This flow collects clinical history about an eye complaint.
 * It does NOT diagnose any condition.
 *
 * Field names follow the QuestionDefinition convention (camelCase).
 * Fields that overlap with existing safetyEngine.ts checks use the
 * same field names so the existing safety engine continues to work.
 */
export const eyeProblemsFlow: QuestionFlow = {
  id: "eye_problems",
  name: "Eye Problems",
  firstQuestionId: "eyeWhich",
  questions: {
    // 1. Which eye?
    eyeWhich: {
      id: "eyeWhich",
      field: "eyeWhich",
      questionEn: "Which eye is affected?",
      questionHi: "कौन सी आँख में तकलीफ है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "right", labelEn: "Right eye", labelHi: "दाहिनी आँख" },
        { value: "left", labelEn: "Left eye", labelHi: "बाईं आँख" },
        { value: "both", labelEn: "Both eyes", labelHi: "दोनों आँखें" },
      ],
      nextQuestionId: "eyeDuration",
    },

    // 2. Duration
    eyeDuration: {
      id: "eyeDuration",
      field: "eyeDuration",
      questionEn: "How long have you had this eye problem?",
      questionHi: "यह आँख की तकलीफ कब से है?",
      answerType: "text",
      required: false,
      nextQuestionId: "eyeSeverity",
    },

    // 3. Severity
    eyeSeverity: {
      id: "eyeSeverity",
      field: "eyeSeverity",
      questionEn: "How severe is the discomfort — on a scale of 0 (no pain) to 10 (worst imaginable)?",
      questionHi: "तकलीफ कितनी है — 0 (कोई दर्द नहीं) से 10 (बहुत ज़्यादा) के पैमाने पर?",
      answerType: "number",
      required: false,
      nextQuestionId: "eyeVisionChange",
    },

    // 4. Vision change — important symptom, asked early
    eyeVisionChange: {
      id: "eyeVisionChange",
      field: "eyeVisionChange",
      questionEn: "Have you noticed any change in your vision — such as blurring, double vision, or loss of vision?",
      questionHi: "क्या आपकी नज़र में कोई बदलाव आया है — जैसे धुंधला दिखना, दोहरा दिखना, या दिखना बंद होना?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No change", labelHi: "कोई बदलाव नहीं" },
        { value: "blurring", labelEn: "Blurring", labelHi: "धुंधला दिखना" },
        { value: "double_vision", labelEn: "Double vision", labelHi: "दोहरा दिखना" },
        { value: "loss", labelEn: "Loss of vision", labelHi: "दिखना बंद/कम होना" },
        { value: "other", labelEn: "Other change", labelHi: "कोई और बदलाव" },
      ],
      nextQuestionId: "eyeRedness",
    },

    // 5. Redness and watering
    eyeRedness: {
      id: "eyeRedness",
      field: "eyeRedness",
      questionEn: "Is your eye red, watering, or discharging?",
      questionHi: "क्या आँख लाल है, पानी आ रहा है, या कोई स्राव हो रहा है?",
      answerType: "multi_select",
      required: false,
      options: [
        { value: "redness", labelEn: "Redness", labelHi: "लाली" },
        { value: "watering", labelEn: "Watering", labelHi: "पानी आना" },
        { value: "discharge", labelEn: "Discharge / pus", labelHi: "मवाद / चिपचिपा स्राव" },
        { value: "itching", labelEn: "Itching", labelHi: "खुजली" },
        { value: "none", labelEn: "None of these", labelHi: "इनमें से कोई नहीं" },
      ],
      nextQuestionId: "eyeInjury",
    },

    // 6. Injury or exposure
    eyeInjury: {
      id: "eyeInjury",
      field: "eyeInjury",
      questionEn: "Was there any injury, something entering the eye, or chemical exposure?",
      questionHi: "क्या कोई चोट लगी, कुछ आँख में गया, या कोई रसायन आँख में लगा?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "foreign_body", labelEn: "Something entered the eye", labelHi: "कुछ आँख में गया" },
        { value: "injury", labelEn: "Physical injury", labelHi: "चोट लगी" },
        { value: "chemical", labelEn: "Chemical exposure", labelHi: "रसायन लगा" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "eyeAssociatedSymptoms",
    },

    // 7. Associated symptoms
    eyeAssociatedSymptoms: {
      id: "eyeAssociatedSymptoms",
      field: "eyeAssociatedSymptoms",
      questionEn: "Do you have any of these along with the eye problem?",
      questionHi: "क्या आँख की तकलीफ के साथ इनमें से कुछ भी है?",
      answerType: "multi_select",
      required: false,
      options: [
        { value: "headache", labelEn: "Headache", labelHi: "सिर दर्द" },
        { value: "fever", labelEn: "Fever", labelHi: "बुखार" },
        { value: "light_sensitivity", labelEn: "Sensitivity to light", labelHi: "रोशनी से तकलीफ" },
        { value: "nausea", labelEn: "Nausea or vomiting", labelHi: "जी मिचलाना या उल्टी" },
        { value: "none", labelEn: "None of these", labelHi: "इनमें से कोई नहीं" },
      ],
      nextQuestionId: "eyeAdditionalNotes",
    },

    // 8. Anything else
    eyeAdditionalNotes: {
      id: "eyeAdditionalNotes",
      field: "eyeAdditionalNotes",
      questionEn: "Is there anything else about your eye problem that you would like the doctor to know?",
      questionHi: "क्या आँख की तकलीफ के बारे में कुछ और है जो आप डॉक्टर को बताना चाहेंगे?",
      answerType: "text",
      required: false,
      nextQuestionId: null,
    },
  },
};
