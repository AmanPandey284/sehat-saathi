import type { QuestionFlow } from "../types";

/**
 * Back Pain — structured history-taking flow.
 *
 * This flow collects clinical history about a back pain complaint.
 * It does NOT diagnose any condition.
 *
 * The `severity` field uses the same name as in the existing safety engine so
 * that a pain score ≥ 8 continues to trigger the existing "severe pain"
 * attention flag in safetyEngine.ts without any changes to that file.
 *
 * `breathingDifficulty` is also kept for potential use by safetyEngine.ts.
 */
export const backPainFlow: QuestionFlow = {
  id: "back_pain",
  name: "Back Pain",
  firstQuestionId: "backLocation",
  questions: {
    // 1. Location
    backLocation: {
      id: "backLocation",
      field: "backLocation",
      questionEn: "Where exactly is your back pain?",
      questionHi: "आपको पीठ में दर्द ठीक कहाँ है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "lower", labelEn: "Lower back (waist area)", labelHi: "नीचे की पीठ (कमर)" },
        { value: "middle", labelEn: "Middle back", labelHi: "बीच की पीठ" },
        { value: "upper", labelEn: "Upper back", labelHi: "ऊपर की पीठ / कंधे के नीचे" },
        { value: "whole", labelEn: "Whole back", labelHi: "पूरी पीठ" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "backDuration",
    },

    // 2. Duration
    backDuration: {
      id: "backDuration",
      field: "backDuration",
      questionEn: "How long have you had this back pain?",
      questionHi: "यह पीठ/कमर का दर्द कब से है?",
      answerType: "text",
      required: false,
      nextQuestionId: "severity",
    },

    // 3. Severity (field name shared with safetyEngine.ts)
    severity: {
      id: "severity",
      field: "severity",
      questionEn: "How severe is the pain — on a scale of 0 (no pain) to 10 (worst imaginable)?",
      questionHi: "दर्द कितना तेज़ है — 0 (कोई दर्द नहीं) से 10 (असहनीय) के पैमाने पर?",
      answerType: "number",
      required: false,
      nextQuestionId: "backInjury",
    },

    // 4. Injury / strain
    backInjury: {
      id: "backInjury",
      field: "backInjury",
      questionEn: "Was the back pain related to an injury, lifting something heavy, or a strain?",
      questionHi: "क्या यह दर्द किसी चोट, भारी चीज़ उठाने, या मोच के कारण हुआ?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No — came on by itself", labelHi: "नहीं — अपने आप हुआ" },
        { value: "injury", labelEn: "Injury or fall", labelHi: "चोट या गिरने से" },
        { value: "lifting", labelEn: "Heavy lifting or strain", labelHi: "भारी चीज़ उठाई या ज़ोर लगाया" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "backRadiation",
    },

    // 5. Radiation to legs (sciatica / nerve involvement)
    backRadiation: {
      id: "backRadiation",
      field: "backRadiation",
      questionEn: "Does the pain travel down into one or both legs?",
      questionHi: "क्या दर्द पैर (एक या दोनों) की तरफ नीचे उतरता है?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "one_leg", labelEn: "Yes — one leg", labelHi: "हाँ — एक पैर में" },
        { value: "both_legs", labelEn: "Yes — both legs", labelHi: "हाँ — दोनों पैरों में" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "backNumbness",
    },

    // 6. Numbness / tingling
    backNumbness: {
      id: "backNumbness",
      field: "backNumbness",
      questionEn: "Do you have numbness, tingling, or a pins-and-needles feeling in your legs or feet?",
      questionHi: "क्या आपके पैरों या पैरों की उंगलियों में सुन्नपन, झनझनाहट, या सुइयाँ चुभने जैसा अहसास है?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "backWeakness",
    },

    // 7. Leg weakness (red-flag: cauda equina territory)
    backWeakness: {
      id: "backWeakness",
      field: "backWeakness",
      questionEn: "Do you have any weakness in your legs — such as difficulty walking, or feeling like the leg might give way?",
      questionHi: "क्या आपके पैरों में कमज़ोरी है — जैसे चलने में दिक्कत, या पैर धोखा दे सकता है?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "backBladderBowel",
    },

    // 8. Bladder / bowel changes (red-flag: cauda equina territory)
    backBladderBowel: {
      id: "backBladderBowel",
      field: "backBladderBowel",
      questionEn: "Have you had any difficulty passing urine or controlling your bowels since the back pain started?",
      questionHi: "क्या पीठ दर्द शुरू होने के बाद पेशाब करने में दिक्कत हुई है या मल पर नियंत्रण कम हुआ है?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "urine", labelEn: "Difficulty passing urine", labelHi: "पेशाब करने में दिक्कत" },
        { value: "bowel", labelEn: "Difficulty controlling bowels", labelHi: "मल पर नियंत्रण में दिक्कत" },
        { value: "both", labelEn: "Both", labelHi: "दोनों" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "backFever",
    },

    // 9. Fever with back pain
    backFever: {
      id: "backFever",
      field: "backFever",
      questionEn: "Do you have a fever along with the back pain?",
      questionHi: "क्या पीठ दर्द के साथ बुखार भी है?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "backAdditionalNotes",
    },

    // 10. Anything else
    backAdditionalNotes: {
      id: "backAdditionalNotes",
      field: "backAdditionalNotes",
      questionEn: "Is there anything else about your back pain that you would like the doctor to know?",
      questionHi: "क्या पीठ/कमर के दर्द के बारे में कुछ और है जो आप डॉक्टर को बताना चाहेंगे?",
      answerType: "text",
      required: false,
      nextQuestionId: null,
    },
  },
};
