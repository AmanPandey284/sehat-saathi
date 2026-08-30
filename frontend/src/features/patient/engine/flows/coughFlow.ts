/**
 * Cough question flow (Milestone 4C).
 *
 * Pure data — a `QuestionFlow` built with the Milestone 4A question engine's
 * types, following the same conventions as `abdominalPainFlow` /
 * `feverFlow`:
 * - Tri-state clinical questions are modeled as `single_select`
 *   yes/no/not_sure.
 * - Phlegm details are only asked when the cough is productive.
 */

import type { QuestionFlow } from "../types";

export const coughFlow: QuestionFlow = {
  id: "cough",
  name: "Cough history",
  firstQuestionId: "duration",
  questions: {
    // 1. Duration
    duration: {
      id: "duration",
      field: "duration",
      questionEn: "How long have you had the cough?",
      questionHi: "आपको खांसी कब से है?",
      answerType: "text",
      required: true,
      nextQuestionId: "coughType",
    },

    // 2. Dry vs productive — productive branches to phlegm details, dry
    // skips straight to fever.
    coughType: {
      id: "coughType",
      field: "coughType",
      questionEn: "Is the cough dry or does it bring up phlegm (productive)?",
      questionHi: "क्या खांसी सूखी है या बलगम आता है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "dry", labelEn: "Dry", labelHi: "सूखी" },
        { value: "productive", labelEn: "Productive (with phlegm)", labelHi: "बलगम वाली" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "fever",
      branches: [
        { field: "coughType", equals: "productive", nextQuestionId: "phlegmColor" },
        { field: "coughType", equals: "dry", nextQuestionId: "fever" },
        { field: "coughType", equals: "not_sure", nextQuestionId: "fever" },
      ],
    },

    // 2a. Phlegm colour/appearance — only when coughType = productive.
    phlegmColor: {
      id: "phlegmColor",
      field: "phlegmColor",
      questionEn: "What colour is the phlegm?",
      questionHi: "बलगम किस रंग का है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "clear_white", labelEn: "Clear/white", labelHi: "साफ़ / सफ़ेद" },
        { value: "yellow_green", labelEn: "Yellow/green", labelHi: "पीला / हरा" },
        { value: "blood_tinged", labelEn: "Blood-tinged", labelHi: "खून जैसा मिला हुआ" },
        { value: "other", labelEn: "Other", labelHi: "अन्य" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "fever",
    },

    // 3. Fever
    fever: {
      id: "fever",
      field: "fever",
      questionEn: "Do you have fever along with the cough?",
      questionHi: "क्या खांसी के साथ बुखार भी है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "breathlessness",
    },

    // 4. Breathlessness
    breathlessness: {
      id: "breathlessness",
      field: "breathlessness",
      questionEn: "Do you feel breathless or short of breath?",
      questionHi: "क्या आपको सांस फूलने या सांस लेने में तकलीफ महसूस होती है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "chestPain",
    },

    // 5. Chest pain
    chestPain: {
      id: "chestPain",
      field: "chestPain",
      questionEn: "Do you have any chest pain?",
      questionHi: "क्या आपको सीने में दर्द है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "bloodInCough",
    },

    // 6. Blood in cough
    bloodInCough: {
      id: "bloodInCough",
      field: "bloodInCough",
      questionEn: "Have you coughed up any blood?",
      questionHi: "क्या खांसी के साथ खून आया है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "smokingExposure",
    },

    // 7. Smoking/tobacco exposure
    smokingExposure: {
      id: "smokingExposure",
      field: "smokingExposure",
      questionEn: "Do you smoke, use tobacco, or have regular exposure to smoke?",
      questionHi: "क्या आप धूम्रपान/तम्बाकू का उपयोग करते हैं, या धुएं के संपर्क में रहते हैं?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "respiratoryHistory",
    },

    // 8. Respiratory history
    respiratoryHistory: {
      id: "respiratoryHistory",
      field: "respiratoryHistory",
      questionEn: "Do you have a history of asthma, TB, or other lung/breathing conditions?",
      questionHi: "क्या आपको अस्थमा, टीबी, या फेफड़ों/सांस से जुड़ी कोई पुरानी बीमारी है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "associatedSymptoms",
    },

    // 9. Anything else — free text, optional, ends the flow.
    associatedSymptoms: {
      id: "associatedSymptoms",
      field: "associatedSymptoms",
      questionEn: "Which other symptoms are you having? Select all that apply.",
      questionHi: "आपको और कौन-कौन से लक्षण हैं? सभी लागू विकल्प चुनें।",
      answerType: "multi_select",
      required: false,
      options: [
        { value: "sore_throat", labelEn: "Sore throat", labelHi: "गले में दर्द" },
        { value: "headache", labelEn: "Headache", labelHi: "सिरदर्द" },
        { value: "body_ache", labelEn: "Body ache", labelHi: "शरीर में दर्द" },
        { value: "weakness", labelEn: "Weakness", labelHi: "कमज़ोरी" },
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
