import type { QuestionFlow } from "../types";

export const customComplaintFlow: QuestionFlow = {
  id: "custom",
  name: "General patient history",
  firstQuestionId: "problemDescription",
  questions: {
    problemDescription: {
      id: "problemDescription", field: "problemDescription",
      questionEn: "Please describe your problem in your own words.",
      questionHi: "कृपया अपनी समस्या अपने शब्दों में बताएं।",
      answerType: "text", required: true, nextQuestionId: "duration"
    },
    duration: {
      id: "duration", field: "duration",
      questionEn: "How long has this problem been present?",
      questionHi: "यह समस्या कब से है?",
      answerType: "text", required: false, nextQuestionId: "severity"
    },
    severity: {
      id: "severity", field: "severity",
      questionEn: "How severe is it, from 0 to 10?",
      questionHi: "यह समस्या 0 से 10 में कितनी गंभीर है?",
      answerType: "number", required: false, nextQuestionId: "associatedSymptoms"
    },
    associatedSymptoms: {
      id: "associatedSymptoms", field: "associatedSymptoms",
      questionEn: "Which other symptoms are you having? Select all that apply.",
      questionHi: "आपको और कौन-कौन से लक्षण हैं? सभी लागू विकल्प चुनें।",
      answerType: "multi_select", required: false,
      options: [
        {value:"pain",labelEn:"Pain",labelHi:"दर्द"},
        {value:"fever",labelEn:"Fever",labelHi:"बुखार"},
        {value:"vomiting",labelEn:"Vomiting",labelHi:"उल्टी"},
        {value:"breathing",labelEn:"Breathing difficulty",labelHi:"सांस लेने में तकलीफ"},
        {value:"weakness",labelEn:"Weakness",labelHi:"कमज़ोरी"},
        {value:"none",labelEn:"None of these",labelHi:"इनमें से कोई नहीं"}
      ],
      nextQuestionId: "additionalNotes"
    },
    additionalNotes: {
      id: "additionalNotes", field: "additionalNotes",
      questionEn: "Is there anything else you want the doctor to know?",
      questionHi: "क्या कुछ और है जो आप डॉक्टर को बताना चाहेंगे?",
      answerType: "text", required: false, nextQuestionId: null
    }
  }
};
