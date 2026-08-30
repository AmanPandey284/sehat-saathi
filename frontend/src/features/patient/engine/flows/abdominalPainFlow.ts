/**
 * Abdominal pain question flow (Milestone 4B).
 *
 * This is pure data — a `QuestionFlow` built with the Milestone 4A question
 * engine's types. It has no UI or React code in it, and the engine itself
 * (questionEngineCore.ts / QuestionEngine.ts) is untouched. This is exactly
 * the kind of flow the engine's docs said would be added later:
 * `abdominalPainFlow` alongside `feverFlow` and `coughFlow` (those two are
 * not built yet).
 *
 * A couple of judgment calls worth noting:
 * - Tri-state questions ("Have you had vomiting?", "Do you have fever?",
 *   etc.) are modeled as `single_select` with options yes/no/not_sure,
 *   since the engine doesn't have a dedicated tri-state answer type and
 *   "not sure" is clinically meaningful (different from a hard "no").
 * - Q13 ("Do you know your temperature?") is modeled as one optional free
 *   text field: the patient can type a number if they know it, or leave it
 *   blank/write "not sure" if they don't. The spec doesn't define a further
 *   sub-branch here, so this keeps it a single question as specified.
 */

import type { QuestionFlow } from "../types";

export const abdominalPainFlow: QuestionFlow = {
  id: "abdominal_pain",
  name: "Abdominal pain history",
  firstQuestionId: "onset",
  questions: {
    // 1. Onset
    onset: {
      id: "onset",
      field: "onsetTime",
      questionEn: "When did the pain start?",
      questionHi: "दर्द कब शुरू हुआ?",
      answerType: "text",
      required: true,
      nextQuestionId: "location",
    },

    // 2. Location
    location: {
      id: "location",
      field: "location",
      questionEn: "Where exactly is the pain?",
      questionHi: "दर्द ठीक कहाँ हो रहा है?",
      answerType: "text",
      required: true,
      nextQuestionId: "onsetPattern",
    },

    // 3. Sudden or gradual
    onsetPattern: {
      id: "onsetPattern",
      field: "onsetPattern",
      questionEn: "Did it start suddenly or gradually?",
      questionHi: "क्या यह अचानक शुरू हुआ या धीरे-धीरे?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "sudden", labelEn: "Suddenly", labelHi: "अचानक" },
        { value: "gradual", labelEn: "Gradually", labelHi: "धीरे-धीरे" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "severity",
    },

    // 4. Severity 0-10
    severity: {
      id: "severity",
      field: "severity",
      questionEn: "How severe is it? (0–10)",
      questionHi: "यह कितना गंभीर है? (0–10 में बताएं)",
      answerType: "number",
      required: true,
      nextQuestionId: "painPattern",
    },

    // 5. Constant or intermittent — branches to episode duration (6) only
    // when intermittent; both paths then continue to pain quality (7).
    painPattern: {
      id: "painPattern",
      field: "painPattern",
      questionEn: "Is it constant or does it come and go?",
      questionHi: "क्या यह लगातार है या आता-जाता रहता है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "constant", labelEn: "Constant", labelHi: "लगातार" },
        {
          value: "intermittent",
          labelEn: "Comes and goes",
          labelHi: "आता-जाता रहता है",
        },
      ],
      nextQuestionId: "painQuality",
      branches: [
        { field: "painPattern", equals: "intermittent", nextQuestionId: "episodeDuration" },
        { field: "painPattern", equals: "constant", nextQuestionId: "painQuality" },
      ],
    },

    // 6. Episode duration — only reached when painPattern = intermittent.
    episodeDuration: {
      id: "episodeDuration",
      field: "episodeDuration",
      questionEn: "How long does each episode usually last?",
      questionHi: "हर बार दर्द कितनी देर तक रहता है?",
      answerType: "text",
      required: true,
      nextQuestionId: "painQuality",
    },

    // 7. Pain quality
    painQuality: {
      id: "painQuality",
      field: "painQuality",
      questionEn: "What does the pain feel like?",
      questionHi: "दर्द कैसा महसूस होता है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "sharp", labelEn: "Sharp", labelHi: "तेज़ / चुभने जैसा" },
        { value: "dull_aching", labelEn: "Dull/aching", labelHi: "हल्का / दुखने जैसा" },
        { value: "burning", labelEn: "Burning", labelHi: "जलन जैसा" },
        { value: "cramping", labelEn: "Cramping", labelHi: "ऐंठन जैसा" },
        {
          value: "pressure_heaviness",
          labelEn: "Pressure/heaviness",
          labelHi: "दबाव / भारीपन जैसा",
        },
        { value: "other", labelEn: "Other", labelHi: "अन्य" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "aggravatingRelieving",
    },

    // 8. What makes it better/worse
    aggravatingRelieving: {
      id: "aggravatingRelieving",
      field: "aggravatingRelieving",
      questionEn: "What makes the pain better or worse?",
      questionHi: "किस चीज़ से दर्द बेहतर या बदतर होता है?",
      answerType: "text",
      required: false,
      nextQuestionId: "vomiting",
    },

    // 9. Vomiting — yes branches into two follow-ups, no/not_sure skip to fever.
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
      nextQuestionId: "fever",
      branches: [
        { field: "vomiting", equals: "yes", nextQuestionId: "vomitCount" },
        { field: "vomiting", equals: "no", nextQuestionId: "fever" },
        { field: "vomiting", equals: "not_sure", nextQuestionId: "fever" },
      ],
    },

    // 10. Vomit count — only when vomiting = yes.
    vomitCount: {
      id: "vomitCount",
      field: "vomitCount",
      questionEn: "How many times have you vomited?",
      questionHi: "आपको कितनी बार उल्टी हुई है?",
      answerType: "number",
      required: true,
      nextQuestionId: "keepingFluidsDown",
    },

    // 11. Keeping food/fluids down — only when vomiting = yes.
    keepingFluidsDown: {
      id: "keepingFluidsDown",
      field: "keepingFluidsDown",
      questionEn: "Are you able to keep food and fluids down?",
      questionHi: "क्या आप खाना और पानी/तरल पदार्थ अंदर रख पा रहे हैं?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "fever",
    },

    // 12. Fever — yes branches to temperature, no/not_sure skip to bowel changes.
    fever: {
      id: "fever",
      field: "fever",
      questionEn: "Do you have fever?",
      questionHi: "क्या आपको बुखार है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "bowelChange",
      branches: [
        { field: "fever", equals: "yes", nextQuestionId: "temperature" },
        { field: "fever", equals: "no", nextQuestionId: "bowelChange" },
        { field: "fever", equals: "not_sure", nextQuestionId: "bowelChange" },
      ],
    },

    // 13. Known temperature — only when fever = yes. Optional free text since
    // the patient may still not know an exact number.
    temperature: {
      id: "temperature",
      field: "temperature",
      questionEn: "Do you know your temperature? If so, please enter it.",
      questionHi: "क्या आपको अपना तापमान पता है? यदि हाँ, तो नीचे लिखें।",
      answerType: "text",
      required: false,
      nextQuestionId: "bowelChange",
    },

    // 14. Bowel changes — branches to frequency (diarrhoea) or last bowel
    // movement (constipation); every other option skips straight to urinary.
    bowelChange: {
      id: "bowelChange",
      field: "bowelChange",
      questionEn: "Have you noticed changes in bowel movements?",
      questionHi: "क्या आपने मल त्याग में कोई बदलाव देखा है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "no_change", labelEn: "No change", labelHi: "कोई बदलाव नहीं" },
        { value: "diarrhoea", labelEn: "Diarrhoea", labelHi: "दस्त" },
        { value: "constipation", labelEn: "Constipation", labelHi: "कब्ज़" },
        { value: "blood_in_stool", labelEn: "Blood in stool", labelHi: "मल में खून" },
        {
          value: "black_tarry_stool",
          labelEn: "Black/tarry stool",
          labelHi: "काला / चिपचिपा मल",
        },
        { value: "other", labelEn: "Other", labelHi: "अन्य" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "urinarySymptoms",
      branches: [
        { field: "bowelChange", equals: "diarrhoea", nextQuestionId: "diarrhoeaFrequency" },
        { field: "bowelChange", equals: "constipation", nextQuestionId: "constipationLastBowelMovement" },
      ],
    },

    // 14a. Diarrhoea frequency — only when bowelChange = diarrhoea.
    diarrhoeaFrequency: {
      id: "diarrhoeaFrequency",
      field: "diarrhoeaFrequency",
      questionEn: "How many times a day does this happen?",
      questionHi: "आपको दस्त दिन में कितनी बार हो रहे हैं?",
      answerType: "text",
      required: true,
      nextQuestionId: "urinarySymptoms",
    },

    // 14b. Last bowel movement — only when bowelChange = constipation.
    constipationLastBowelMovement: {
      id: "constipationLastBowelMovement",
      field: "lastBowelMovement",
      questionEn: "When did your last bowel movement occur?",
      questionHi: "आपका आखिरी मल त्याग कब हुआ था?",
      answerType: "text",
      required: true,
      nextQuestionId: "urinarySymptoms",
    },

    // 15. Urinary symptoms — yes branches to the symptom type, no/not_sure
    // skip straight to the closing free-text question.
    urinarySymptoms: {
      id: "urinarySymptoms",
      field: "urinarySymptoms",
      questionEn: "Any pain or difficulty while urinating?",
      questionHi: "क्या पेशाब करते समय दर्द या तकलीफ होती है?",
      answerType: "single_select",
      required: true,
      options: [
        { value: "yes", labelEn: "Yes", labelHi: "हाँ" },
        { value: "no", labelEn: "No", labelHi: "नहीं" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "additionalNotes",
      branches: [
        { field: "urinarySymptoms", equals: "yes", nextQuestionId: "urinarySymptomType" },
        { field: "urinarySymptoms", equals: "no", nextQuestionId: "additionalNotes" },
        { field: "urinarySymptoms", equals: "not_sure", nextQuestionId: "additionalNotes" },
      ],
    },

    // 15a. Urinary symptom type — only when urinarySymptoms = yes.
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
        {
          value: "difficulty_starting",
          labelEn: "Difficulty starting/passing urine",
          labelHi: "पेशाब शुरू करने/करने में तकलीफ",
        },
        { value: "other", labelEn: "Other", labelHi: "अन्य" },
        { value: "not_sure", labelEn: "Not sure", labelHi: "पता नहीं" },
      ],
      nextQuestionId: "associatedSymptoms",
    },

    // 16. Anything else — free text, optional, ends the flow.
    associatedSymptoms: {
      id: "associatedSymptoms",
      field: "associatedSymptoms",
      questionEn: "Which other symptoms are you having? Select all that apply.",
      questionHi: "आपको और कौन-कौन से लक्षण हैं? सभी लागू विकल्प चुनें。",
      answerType: "multi_select",
      required: false,
      options: [
        { value: "nausea", labelEn: "Nausea", labelHi: "जी मिचलाना" },
        { value: "loss_of_appetite", labelEn: "Loss of appetite", labelHi: "भूख कम लगना" },
        { value: "weakness", labelEn: "Weakness", labelHi: "कमज़ोरी" },
        { value: "dizziness", labelEn: "Dizziness", labelHi: "चक्कर" },
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
