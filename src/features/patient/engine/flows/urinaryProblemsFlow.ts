import type { QuestionFlow } from "../types";

/**
 * Urinary Problems — structured history-taking flow.
 *
 * This flow collects clinical history about a urinary complaint.
 * It does NOT diagnose any condition.
 *
 * The `severity` field uses the same name as in the existing safety engine so
 * that a pain score ≥ 8 continues to trigger the existing "severe pain"
 * attention flag in safetyEngine.ts without any changes to that file.
 */
export const urinaryProblemsFlow: QuestionFlow = {
  id: "urinary_problems",
  name: "Urinary Problems",
  firstQuestionId: "urinaryMainSymptom",
  questions: {
    // 1. Main urinary symptom
    urinaryMainSymptom: {
      id: "urinaryMainSymptom",
      field: "urinaryMainSymptom",
      questionEn: "What is the main urinary symptom you are experiencing?",
      questionHi: "आपको पेशाब से जुड़ी मुख्य तकलीफ क्या है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "burning", labelEn: "Burning or pain when passing urine", labelHi: "पेशाब करते समय जलन या दर्द" },
        { value: "frequency", labelEn: "Passing urine very often", labelHi: "बार-बार पेशाब आना" },
        { value: "urgency", labelEn: "Sudden urge to pass urine", labelHi: "अचानक पेशाब की तेज़ ज़रूरत" },
        { value: "difficulty", labelEn: "Difficulty starting or emptying", labelHi: "पेशाब शुरू करने या पूरा करने में दिक्कत" },
        { value: "blood", labelEn: "Blood in urine", labelHi: "पेशाब में खून" },
        { value: "leaking", labelEn: "Leaking urine", labelHi: "पेशाब का रिसाव" },
        { value: "no_urine", labelEn: "Unable to pass urine at all", labelHi: "बिल्कुल पेशाब नहीं आना" },
        { value: "other", labelEn: "Other", labelHi: "कुछ और" },
      ],
      nextQuestionId: "urinaryDuration",
    },

    // 2. Duration
    urinaryDuration: {
      id: "urinaryDuration",
      field: "urinaryDuration",
      questionEn: "How long have you had this urinary problem?",
      questionHi: "यह पेशाब की तकलीफ कब से है?",
      answerType: "text",
      required: false,
      nextQuestionId: "urinaryBurning",
    },

    // 3. Burning / pain on urination
    urinaryBurning: {
      id: "urinaryBurning",
      field: "urinaryBurning",
      questionEn: "Do you have burning or pain when passing urine?",
      questionHi: "क्या पेशाब करते समय जलन या दर्द होती है?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "mild", labelEn: "Mild burning / discomfort", labelHi: "हल्की जलन / तकलीफ" },
        { value: "severe", labelEn: "Severe burning / pain", labelHi: "तेज़ जलन / दर्द" },
      ],
      nextQuestionId: "urinaryFrequency",
    },

    // 4. Frequency / urgency
    urinaryFrequency: {
      id: "urinaryFrequency",
      field: "urinaryFrequency",
      questionEn: "Are you passing urine more often than usual, or feeling a sudden urge you can barely control?",
      questionHi: "क्या आप सामान्य से ज़्यादा बार पेशाब कर रहे हैं, या अचानक तेज़ पेशाब आती है जिसे रोकना मुश्किल हो?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "frequency", labelEn: "More often than usual", labelHi: "सामान्य से ज़्यादा बार" },
        { value: "urgency", labelEn: "Sudden urgency", labelHi: "अचानक तेज़ पेशाब" },
        { value: "both", labelEn: "Both", labelHi: "दोनों" },
      ],
      nextQuestionId: "urinaryDifficulty",
    },

    // 5. Difficulty starting or emptying
    urinaryDifficulty: {
      id: "urinaryDifficulty",
      field: "urinaryDifficulty",
      questionEn: "Do you have difficulty starting to pass urine, or a feeling that the bladder is not fully empty afterwards?",
      questionHi: "क्या पेशाब शुरू करने में दिक्कत होती है, या बाद में लगता है कि पेशाब पूरा नहीं हुआ?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "starting", labelEn: "Difficulty starting", labelHi: "शुरू करने में दिक्कत" },
        { value: "incomplete", labelEn: "Feeling of incomplete emptying", labelHi: "पूरा नहीं होने का अहसास" },
        { value: "both", labelEn: "Both", labelHi: "दोनों" },
      ],
      nextQuestionId: "urinaryBlood",
    },

    // 6. Blood in urine
    urinaryBlood: {
      id: "urinaryBlood",
      field: "urinaryBlood",
      questionEn: "Have you noticed any blood in your urine?",
      questionHi: "क्या आपने पेशाब में खून देखा है?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "not_sure", labelEn: "Not sure — urine looks darker than usual", labelHi: "पता नहीं — पेशाब सामान्य से गहरे रंग का है" },
      ],
      nextQuestionId: "urinaryFever",
    },

    // 7. Fever / chills
    urinaryFever: {
      id: "urinaryFever",
      field: "urinaryFever",
      questionEn: "Do you have fever or chills along with the urinary problem?",
      questionHi: "क्या पेशाब की तकलीफ के साथ बुखार या ठंड लग रही है?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "fever", labelEn: "Fever", labelHi: "बुखार" },
        { value: "chills", labelEn: "Chills / shivering", labelHi: "ठंड / कंपकंपी" },
        { value: "both", labelEn: "Fever and chills", labelHi: "बुखार और ठंड" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "urinaryPain",
    },

    // 8. Lower abdominal / back / flank pain
    urinaryPain: {
      id: "urinaryPain",
      field: "urinaryPain",
      questionEn: "Do you have pain in your lower abdomen, back, or side (flank)?",
      questionHi: "क्या नीचे पेट में, पीठ में, या करवट (बगल) में दर्द है?",
      answerType: "multi_select",
      required: false,
      options: [
        { value: "lower_abdomen", labelEn: "Lower abdomen", labelHi: "नीचे पेट में" },
        { value: "back", labelEn: "Back (lower)", labelHi: "पीठ (नीचे)" },
        { value: "flank", labelEn: "Side / flank", labelHi: "करवट / बगल" },
        { value: "none", labelEn: "No pain in these areas", labelHi: "इन जगहों पर कोई दर्द नहीं" },
      ],
      nextQuestionId: "urinaryAdditionalNotes",
    },

    // 9. Anything else
    urinaryAdditionalNotes: {
      id: "urinaryAdditionalNotes",
      field: "urinaryAdditionalNotes",
      questionEn: "Is there anything else about the urinary problem that you would like the doctor to know?",
      questionHi: "क्या पेशाब की तकलीफ के बारे में कुछ और है जो आप डॉक्टर को बताना चाहेंगे?",
      answerType: "text",
      required: false,
      nextQuestionId: null,
    },
  },
};
