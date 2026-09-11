import type { QuestionFlow } from "../types";

/**
 * Joint Pain — structured history-taking flow.
 *
 * This flow collects clinical history about a joint pain complaint.
 * It does NOT diagnose any condition.
 *
 * The `severity` field uses the same name as in the existing safety engine so
 * that a pain score ≥ 8 continues to trigger the existing "severe pain"
 * attention flag in safetyEngine.ts without any changes to that file.
 */
export const jointPainFlow: QuestionFlow = {
  id: "joint_pain",
  name: "Joint Pain",
  firstQuestionId: "jointLocation",
  questions: {
    // 1. Which joint(s)
    jointLocation: {
      id: "jointLocation",
      field: "jointLocation",
      questionEn: "Which joint or joints are painful?",
      questionHi: "किस जोड़ या किन जोड़ों में दर्द है?",
      answerType: "text",
      required: true,
      nextQuestionId: "jointDuration",
    },

    // 2. Duration
    jointDuration: {
      id: "jointDuration",
      field: "jointDuration",
      questionEn: "How long have you had this joint pain?",
      questionHi: "यह जोड़ों का दर्द कब से है?",
      answerType: "text",
      required: false,
      nextQuestionId: "severity",
    },

    // 3. Severity (field name shared with safetyEngine.ts)
    severity: {
      id: "severity",
      field: "severity",
      questionEn: "How severe is the joint pain — on a scale of 0 (no pain) to 10 (worst imaginable)?",
      questionHi: "जोड़ों का दर्द कितना तेज़ है — 0 (कोई दर्द नहीं) से 10 (असहनीय) के पैमाने पर?",
      answerType: "number",
      required: false,
      nextQuestionId: "jointMultiple",
    },

    // 4. Multiple joints
    jointMultiple: {
      id: "jointMultiple",
      field: "jointMultiple",
      questionEn: "Are multiple joints affected, or is it just one?",
      questionHi: "क्या एक से ज़्यादा जोड़ प्रभावित हैं, या सिर्फ एक?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "single", labelEn: "Just one joint", labelHi: "सिर्फ एक जोड़" },
        { value: "multiple", labelEn: "Multiple joints", labelHi: "कई जोड़" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "jointInjury",
    },

    // 5. Injury
    jointInjury: {
      id: "jointInjury",
      field: "jointInjury",
      questionEn: "Was the joint pain caused by an injury or accident?",
      questionHi: "क्या जोड़ का दर्द किसी चोट या दुर्घटना के कारण हुआ?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No — came on by itself", labelHi: "नहीं — अपने आप हुआ" },
        { value: "yes", labelEn: "Yes — injury or accident", labelHi: "हाँ — चोट या दुर्घटना" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "jointSwelling",
    },

    // 6. Swelling
    jointSwelling: {
      id: "jointSwelling",
      field: "jointSwelling",
      questionEn: "Is there swelling around the painful joint?",
      questionHi: "क्या दर्द वाले जोड़ के आसपास सूजन है?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "jointRedness",
    },

    // 7. Redness / warmth
    jointRedness: {
      id: "jointRedness",
      field: "jointRedness",
      questionEn: "Is the joint red or unusually warm to the touch?",
      questionHi: "क्या जोड़ लाल है या छूने पर सामान्य से ज़्यादा गर्म लगता है?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "redness", labelEn: "Red", labelHi: "लाल" },
        { value: "warmth", labelEn: "Warm", labelHi: "गर्म" },
        { value: "both", labelEn: "Both red and warm", labelHi: "लाल और गर्म दोनों" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "jointStiffness",
    },

    // 8. Stiffness
    jointStiffness: {
      id: "jointStiffness",
      field: "jointStiffness",
      questionEn: "Is the joint stiff — especially in the morning or after resting?",
      questionHi: "क्या जोड़ अकड़ा हुआ महसूस होता है — खासकर सुबह उठने पर या आराम के बाद?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No stiffness", labelHi: "कोई अकड़न नहीं" },
        { value: "morning", labelEn: "Stiff in the morning", labelHi: "सुबह अकड़न होती है" },
        { value: "after_rest", labelEn: "Stiff after resting", labelHi: "आराम के बाद अकड़न" },
        { value: "always", labelEn: "Stiff most of the time", labelHi: "अक्सर अकड़न रहती है" },
      ],
      nextQuestionId: "jointFever",
    },

    // 9. Fever with joint pain
    jointFever: {
      id: "jointFever",
      field: "jointFever",
      questionEn: "Do you have a fever along with the joint pain?",
      questionHi: "क्या जोड़ के दर्द के साथ बुखार भी है?",
      answerType: "single_select",
      required: false,
      options: [
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "jointAdditionalNotes",
    },

    // 10. Anything else
    jointAdditionalNotes: {
      id: "jointAdditionalNotes",
      field: "jointAdditionalNotes",
      questionEn: "Is there anything else about the joint pain that you would like the doctor to know?",
      questionHi: "क्या जोड़ के दर्द के बारे में कुछ और है जो आप डॉक्टर को बताना चाहेंगे?",
      answerType: "text",
      required: false,
      nextQuestionId: null,
    },
  },
};
