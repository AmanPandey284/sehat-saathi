import type { QuestionFlow } from "../types";

/**
 * Headache — structured history-taking flow.
 *
 * This flow collects clinical history about a headache complaint.
 * It does NOT diagnose any condition.
 *
 * The `severity` field uses the same name as in the existing safety engine so
 * that a pain score ≥ 8 continues to trigger the existing "severe pain"
 * attention flag in safetyEngine.ts without any changes to that file.
 */
export const headacheFlow: QuestionFlow = {
  id: "headache",
  name: "Headache",
  firstQuestionId: "headacheLocation",
  questions: {
    // 1. Location
    headacheLocation: {
      id: "headacheLocation",
      field: "headacheLocation",
      questionEn: "Where exactly do you feel the headache?",
      questionHi: "सिर में दर्द ठीक कहाँ महसूस हो रहा है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "whole_head", labelEn: "Whole head", labelHi: "पूरे सिर में" },
        { value: "forehead", labelEn: "Forehead / front", labelHi: "माथा / आगे की तरफ" },
        { value: "one_side", labelEn: "One side", labelHi: "एक तरफ" },
        { value: "temples", labelEn: "Temples", labelHi: "कनपटी" },
        { value: "back_of_head", labelEn: "Back of head", labelHi: "सिर के पीछे" },
        { value: "behind_eyes", labelEn: "Behind the eyes", labelHi: "आँखों के पीछे" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "headacheDuration",
    },

    // 2. Duration
    headacheDuration: {
      id: "headacheDuration",
      field: "headacheDuration",
      questionEn: "How long have you had this headache?",
      questionHi: "यह सिर दर्द कब से है?",
      answerType: "text",
      required: false,
      nextQuestionId: "severity",
    },

    // 3. Severity (uses shared field name recognised by safetyEngine.ts)
    severity: {
      id: "severity",
      field: "severity",
      questionEn: "How severe is the headache — on a scale of 0 (no pain) to 10 (worst imaginable)?",
      questionHi: "सिर दर्द कितना तेज़ है — 0 (कोई दर्द नहीं) से 10 (असहनीय) के पैमाने पर?",
      answerType: "number",
      required: false,
      nextQuestionId: "headacheOnset",
    },

    // 4. Onset character — sudden severe headache is an important clinical marker
    headacheOnset: {
      id: "headacheOnset",
      field: "headacheOnset",
      questionEn: "Did the headache come on suddenly, or did it develop gradually?",
      questionHi: "क्या सिर दर्द अचानक शुरू हुआ या धीरे-धीरे बढ़ा?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "sudden", labelEn: "Sudden — came on very quickly", labelHi: "अचानक — बहुत जल्दी शुरू हुआ" },
        { value: "gradual", labelEn: "Gradual — built up slowly", labelHi: "धीरे-धीरे — धीमे-धीमे बढ़ा" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "headachePattern",
    },

    // 5. Pattern / frequency
    headachePattern: {
      id: "headachePattern",
      field: "headachePattern",
      questionEn: "How often do you get headaches like this?",
      questionHi: "इस तरह का सिर दर्द कितनी बार होता है?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "first_time", labelEn: "First time", labelHi: "पहली बार" },
        { value: "occasional", labelEn: "Occasionally", labelHi: "कभी-कभी" },
        { value: "frequent", labelEn: "Frequently (several times a week)", labelHi: "बार-बार (हफ्ते में कई बार)" },
        { value: "daily", labelEn: "Every day", labelHi: "रोज़" },
      ],
      nextQuestionId: "headacheVisualSymptoms",
    },

    // 6. Visual symptoms / aura
    headacheVisualSymptoms: {
      id: "headacheVisualSymptoms",
      field: "headacheVisualSymptoms",
      questionEn: "Do you have any visual symptoms with the headache — such as flashing lights, zig-zag lines, or blurred vision?",
      questionHi: "क्या सिर दर्द के साथ आँखों में कुछ दिखता है — जैसे चमकती रोशनी, टेढ़ी-मेढ़ी लकीरें, या धुंधला दिखना?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "headacheNausea",
    },

    // 7. Nausea / vomiting
    headacheNausea: {
      id: "headacheNausea",
      field: "headacheNausea",
      questionEn: "Do you have nausea or vomiting along with the headache?",
      questionHi: "क्या सिर दर्द के साथ जी मिचलाना या उल्टी भी है?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "nausea_only", labelEn: "Nausea only", labelHi: "सिर्फ जी मिचलाना" },
        { value: "vomiting", labelEn: "Vomiting", labelHi: "उल्टी" },
      ],
      nextQuestionId: "headacheLightSensitivity",
    },

    // 8. Light / noise sensitivity
    headacheLightSensitivity: {
      id: "headacheLightSensitivity",
      field: "headacheLightSensitivity",
      questionEn: "Does bright light or loud noise make the headache worse?",
      questionHi: "क्या तेज़ रोशनी या तेज़ आवाज़ से सिर दर्द बढ़ता है?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "light", labelEn: "Light makes it worse", labelHi: "रोशनी से बढ़ता है" },
        { value: "noise", labelEn: "Noise makes it worse", labelHi: "आवाज़ से बढ़ता है" },
        { value: "both", labelEn: "Both", labelHi: "दोनों" },
      ],
      nextQuestionId: "headacheAdditionalNotes",
    },

    // 9. Anything else
    headacheAdditionalNotes: {
      id: "headacheAdditionalNotes",
      field: "headacheAdditionalNotes",
      questionEn: "Is there anything else about your headache that you would like the doctor to know?",
      questionHi: "क्या सिर दर्द के बारे में कुछ और है जो आप डॉक्टर को बताना चाहेंगे?",
      answerType: "text",
      required: false,
      nextQuestionId: null,
    },
  },
};
