import type { QuestionFlow } from "../types";

/**
 * Skin Problems — structured history-taking flow.
 *
 * This flow collects clinical history about a skin complaint.
 * It does NOT diagnose any condition.
 */
export const skinProblemsFlow: QuestionFlow = {
  id: "skin_problems",
  name: "Skin Problems",
  firstQuestionId: "skinLocation",
  questions: {
    // 1. Location
    skinLocation: {
      id: "skinLocation",
      field: "skinLocation",
      questionEn: "Where on your body is the skin problem?",
      questionHi: "त्वचा की समस्या शरीर के किस हिस्से पर है?",
      answerType: "text",
      required: true,
      nextQuestionId: "skinDuration",
    },

    // 2. Duration
    skinDuration: {
      id: "skinDuration",
      field: "skinDuration",
      questionEn: "How long have you had this skin problem?",
      questionHi: "यह त्वचा की समस्या कब से है?",
      answerType: "text",
      required: false,
      nextQuestionId: "skinAppearance",
    },

    // 3. Type / appearance of skin change
    skinAppearance: {
      id: "skinAppearance",
      field: "skinAppearance",
      questionEn: "Which of these best describes the skin problem? (Select all that apply)",
      questionHi: "त्वचा की समस्या को इनमें से कैसे बताएँगे? (सभी लागू विकल्प चुनें)",
      answerType: "multi_select",
      required: false,
      options: [
        { value: "rash", labelEn: "Rash or red patches", labelHi: "चकत्ते या लाल धब्बे" },
        { value: "bumps", labelEn: "Raised bumps or spots", labelHi: "उभरे हुए दाने" },
        { value: "blisters", labelEn: "Blisters or fluid-filled spots", labelHi: "फफोले या पानी भरे दाने" },
        { value: "dry_flaking", labelEn: "Dry, flaking, or scaly skin", labelHi: "रूखी, पपड़ीदार त्वचा" },
        { value: "discolouration", labelEn: "Change in skin colour", labelHi: "रंग में बदलाव" },
        { value: "swelling", labelEn: "Swelling", labelHi: "सूजन" },
        { value: "open_sore", labelEn: "Open sore or wound", labelHi: "खुला घाव" },
        { value: "none_of_above", labelEn: "None of the above", labelHi: "ऊपर में से कोई नहीं" },
      ],
      nextQuestionId: "skinItching",
    },

    // 4. Itching
    skinItching: {
      id: "skinItching",
      field: "skinItching",
      questionEn: "Is the skin itchy?",
      questionHi: "क्या त्वचा में खुजली है?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "mild", labelEn: "Mild itching", labelHi: "हल्की खुजली" },
        { value: "severe", labelEn: "Severe itching", labelHi: "बहुत तेज़ खुजली" },
      ],
      nextQuestionId: "skinPain",
    },

    // 5. Pain
    skinPain: {
      id: "skinPain",
      field: "skinPain",
      questionEn: "Is the affected skin area painful or tender to touch?",
      questionHi: "क्या उस त्वचा पर दर्द है या छूने पर तकलीफ होती है?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "skinSpreading",
    },

    // 6. Spreading / changing over time
    skinSpreading: {
      id: "skinSpreading",
      field: "skinSpreading",
      questionEn: "Has the skin problem been spreading or changing since it appeared?",
      questionHi: "क्या त्वचा की समस्या फैल रही है या बदल रही है?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no_change", labelEn: "No — staying the same", labelHi: "नहीं — वैसी ही है" },
        { value: "spreading", labelEn: "Yes — spreading", labelHi: "हाँ — फैल रही है" },
        { value: "improving", labelEn: "Improving", labelHi: "ठीक हो रही है" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "skinFever",
    },

    // 7. Fever with skin problem
    skinFever: {
      id: "skinFever",
      field: "skinFever",
      questionEn: "Do you have a fever along with the skin problem?",
      questionHi: "क्या त्वचा की समस्या के साथ बुखार भी है?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "skinExposure",
    },

    // 8. Relevant exposure / new products
    skinExposure: {
      id: "skinExposure",
      field: "skinExposure",
      questionEn: "Before the skin problem started, did you use any new product, soap, cream, or medicine — or come into contact with anything unusual?",
      questionHi: "त्वचा की समस्या शुरू होने से पहले क्या कोई नया उत्पाद, साबुन, क्रीम, या दवा इस्तेमाल की — या किसी असामान्य चीज़ से संपर्क हुआ?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "skinAdditionalNotes",
    },

    // 9. Anything else
    skinAdditionalNotes: {
      id: "skinAdditionalNotes",
      field: "skinAdditionalNotes",
      questionEn: "Is there anything else about the skin problem that you would like the doctor to know?",
      questionHi: "क्या त्वचा की समस्या के बारे में कुछ और है जो आप डॉक्टर को बताना चाहेंगे?",
      answerType: "text",
      required: false,
      nextQuestionId: null,
    },
  },
};
