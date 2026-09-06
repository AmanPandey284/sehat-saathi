/**
 * Translation dictionary.
 *
 * This is intentionally a plain object, not a library like i18next — at two
 * languages and a handful of strings, a dependency isn't justified yet. The
 * shape (Language union + nested key lookup via LanguageContext) is designed
 * so swapping in a real i18n library later, or adding more languages, only
 * touches this file and LanguageContext.tsx — no component changes.
 */

export type Language = "en" | "hi";

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  hi: "हिंदी",
};

export const translations = {
  en: {
    brand: "Sehat Saathi",
    status: {
      checking: "Checking backend…",
      online: "Backend connected",
      offline: "Backend offline",
    },
    landing: {
      heading: "Tell us what is bothering you. We’ll help prepare your history for the doctor.",
      subheading:
        "Sehat Saathi helps you share what is bothering you, collects the important details before your visit, and puts your history together for your doctor.",
      startButton: "Start Consultation",
      doctorButton: "I'm a doctor",
      workflowTitle: "How a visit works",
      privacyTitle: "Your privacy",
      privacyBody:
        "Before you begin, we'll ask for your consent and explain exactly what Sehat Saathi does with your information.",
      disclaimer:
        "Information collected here is for your doctor's review. Sehat Saathi does not diagnose or prescribe; your doctor makes the final medical decisions.",
      stages: [
        {
          label: "Identify",
          detail: "Confirm who you are and give consent to share your history.",
        },
        {
          label: "Converse",
          detail: "Answer simple questions about how you're feeling, in your own words.",
        },
        {
          label: "Scan",
          detail: "Show us any old prescriptions or reports — we'll read them for you.",
        },
        {
          label: "Summarize & route",
          detail: "We organize everything into a clear history for your doctor.",
        },
        {
          label: "Consult",
          detail: "Your doctor reviews and confirms it, then spends your time on you.",
        },
      ],
    },
    consent: {
      title: "Before we begin",
      intro:
        "Please read this carefully. You can cancel at any time before you agree.",
      points: [
        "We collect the information you provide about your symptoms and health history.",
        "That information is organized into a structured history for your doctor to review.",
        "Sehat Saathi does not diagnose you or recommend treatment — only your doctor makes medical decisions.",
        "You can review everything before it's shared, and your doctor can edit or reject anything the system records.",
      ],
      agree: "I Agree & Continue",
      cancel: "Cancel",
    },
    complaint: {
      heading: "What brings you here today?",
      subheading:
        "Tell us what you're experiencing. You can describe it in your own words.",
      textareaLabel: "Describe what you're experiencing",
      textareaPlaceholder: "For example: I have had stomach pain for three days.",
      quickButtonsLabel: "Or choose the closest match",
      quickButtons: {
        abdominal_pain: "Abdominal Pain",
        fever: "Fever",
        cough: "Cough",
      },
      continueButton: "Continue",
      backButton: "Back",
      emptyInputError: "Please describe your concern, or choose one of the options above.",
      unknownTitle: "We don't yet have a guided history for this complaint.",
      unknownBody:
        "Sehat Saathi currently supports guided questions for abdominal pain, fever, and cough. We haven't guessed at your concern so nothing incorrect gets recorded.",
      continueGeneral: "Continue with general information",
      generalPlaceholderMessage:
        "Your problem is saved in your own words. A general intake can continue without guessing a diagnosis.",
      goBack: "Go back",
      confirmLead: "We understood your main concern as:",
      confirmQuestion: "Is that correct?",
      yesContinue: "Yes, continue",
      change: "Change",
      progressLabel: "Step 2 of 5: Chief complaint",
    },
    history: {
      progressLabel: "Step 3 of 5: Your history",
      continueButton: "Continue",
      backButton: "Back",
      requiredError: "Please answer this question to continue.",
      invalidNumberError: "Please enter a number.",
      invalidOptionError: "Please choose one of the options above.",
      optionalHint: "Optional — you can leave this blank.",
      reviewHeading: "Your answers so far",
      editLink: "Edit",
      notSupportedTitle: "We don't have guided questions for this yet.",
      notSupportedBody:
        "Sehat Saathi currently has guided histories for abdominal pain, fever and cough.",
      noComplaintTitle: "Let's start with your main concern first.",
      noComplaintBody:
        "We need to know what brings you in today before we can ask the right follow-up questions.",
      backToComplaint: "Back to main concern",
      completeTitle: "Thank you — that's everything for now.",
      completeBody:
        "Your answers are saved for this visit. Your answers are saved for this visit and can be reviewed before physician review.",
      backToHome: "Back to start",
    },
  },
  hi: {
    brand: "सेहत साथी",
    status: {
      checking: "बैकएंड जांचा जा रहा है…",
      online: "बैकएंड जुड़ा हुआ है",
      offline: "बैकएंड उपलब्ध नहीं है",
    },
    landing: {
      heading: "अपनी परेशानी बताइए। हम आपकी जानकारी डॉक्टर के लिए पहले से तैयार करने में मदद करेंगे।",
      subheading:
        "सेहत साथी आपकी समस्या और जरूरी जानकारी पहले से दर्ज करने में मदद करता है, ताकि डॉक्टर आपकी बात और जांच पर ज्यादा समय दे सकें।",
      startButton: "परामर्श शुरू करें",
      doctorButton: "मैं डॉक्टर हूं",
      workflowTitle: "यह प्रक्रिया कैसे काम करती है",
      privacyTitle: "आपकी निजता",
      privacyBody:
        "शुरू करने से पहले, हम आपकी सहमति लेंगे और बताएंगे कि सेहत साथी आपकी जानकारी का उपयोग कैसे करता है।",
      disclaimer:
        "एआई द्वारा तैयार जानकारी केवल डॉक्टर की समीक्षा के लिए है और यह निदान नहीं है। सेहत साथी कभी भी दवा या निदान नहीं बताता — हर जानकारी को मेडिकल रिकॉर्ड का हिस्सा बनने से पहले डॉक्टर द्वारा पुष्टि किया जाता है।",
      stages: [
        {
          label: "पहचान",
          detail: "अपनी पहचान की पुष्टि करें और अपना इतिहास साझा करने की सहमति दें।",
        },
        {
          label: "बातचीत",
          detail: "अपनी भाषा में बताएं कि आपको कैसा महसूस हो रहा है।",
        },
        {
          label: "स्कैन",
          detail: "पुरानी पर्ची या रिपोर्ट दिखाएं — हम उन्हें पढ़ लेंगे।",
        },
        {
          label: "सारांश",
          detail: "हम सब कुछ आपके डॉक्टर के लिए एक स्पष्ट विवरण में व्यवस्थित करते हैं।",
        },
        {
          label: "परामर्श",
          detail: "आपके डॉक्टर इसकी समीक्षा और पुष्टि करते हैं, फिर अपना समय आप पर लगाते हैं।",
        },
      ],
    },
    consent: {
      title: "शुरू करने से पहले",
      intro: "कृपया ध्यान से पढ़ें। सहमत होने से पहले आप कभी भी रद्द कर सकते हैं।",
      points: [
        "हम आपके लक्षणों और स्वास्थ्य इतिहास के बारे में दी गई जानकारी एकत्र करते हैं।",
        "इस जानकारी को आपके डॉक्टर की समीक्षा के लिए एक व्यवस्थित विवरण में तैयार किया जाता है।",
        "सेहत साथी आपका निदान या इलाज सुझाव नहीं देता — केवल आपका डॉक्टर चिकित्सीय निर्णय लेता है।",
        "साझा करने से पहले आप सब कुछ देख सकते हैं, और आपका डॉक्टर किसी भी जानकारी को बदल या अस्वीकार कर सकता है।",
      ],
      agree: "मैं सहमत हूं और आगे बढ़ता हूं",
      cancel: "रद्द करें",
    },
    complaint: {
      heading: "आप आज यहाँ किस समस्या के लिए आए हैं?",
      subheading: "हमें बताएं कि आपको क्या महसूस हो रहा है। अपने शब्दों में बता सकते हैं।",
      textareaLabel: "बताएं कि आपको क्या महसूस हो रहा है",
      textareaPlaceholder: "उदाहरण: मुझे तीन दिनों से पेट में दर्द हो रहा है।",
      quickButtonsLabel: "या नीचे से नज़दीकी विकल्प चुनें",
      quickButtons: {
        abdominal_pain: "पेट दर्द",
        fever: "बुखार",
        cough: "खांसी",
      },
      continueButton: "आगे बढ़ें",
      backButton: "वापस",
      emptyInputError: "कृपया अपनी समस्या बताएं, या ऊपर दिए गए विकल्पों में से एक चुनें।",
      unknownTitle: "इस समस्या के लिए अभी हमारे पास मार्गदर्शित प्रश्न नहीं हैं।",
      unknownBody:
        "सेहत साथी फिलहाल पेट दर्द, बुखार और खांसी के लिए मार्गदर्शित प्रश्नों का समर्थन करता है। हमने अनुमान नहीं लगाया, ताकि कोई गलत जानकारी दर्ज न हो।",
      continueGeneral: "सामान्य जानकारी के साथ आगे बढ़ें",
      generalPlaceholderMessage: "सामान्य इतिहास सहायता एक आगामी संस्करण में जोड़ी जाएगी।",
      goBack: "वापस जाएं",
      confirmLead: "हमने आपकी मुख्य समस्या इस रूप में समझी:",
      confirmQuestion: "क्या यह सही है?",
      yesContinue: "हां, आगे बढ़ें",
      change: "बदलें",
      progressLabel: "चरण 2 / 5: मुख्य समस्या",
    },
    history: {
      progressLabel: "चरण 3 / 5: आपका इतिहास",
      continueButton: "आगे बढ़ें",
      backButton: "वापस",
      requiredError: "आगे बढ़ने के लिए कृपया इस प्रश्न का उत्तर दें।",
      invalidNumberError: "कृपया एक संख्या दर्ज करें।",
      invalidOptionError: "कृपया ऊपर दिए गए विकल्पों में से एक चुनें।",
      optionalHint: "वैकल्पिक — आप इसे खाली छोड़ सकते हैं।",
      reviewHeading: "आपके अब तक के उत्तर",
      editLink: "बदलें",
      notSupportedTitle: "अभी इसके लिए मार्गदर्शित प्रश्न उपलब्ध नहीं हैं।",
      notSupportedBody:
        "फिलहाल सेहत साथी में केवल पेट दर्द के लिए मार्गदर्शित प्रश्न हैं। अन्य समस्याओं के लिए यह सुविधा आगामी संस्करण में जोड़ी जाएगी।",
      noComplaintTitle: "पहले अपनी मुख्य समस्या बताएं।",
      noComplaintBody:
        "सही सवाल पूछने से पहले हमें यह जानना होगा कि आप आज यहाँ किस समस्या के लिए आए हैं।",
      backToComplaint: "मुख्य समस्या पर वापस जाएं",
      completeTitle: "धन्यवाद — फिलहाल इतना ही काफी है।",
      completeBody:
        "इस विज़िट के लिए आपके उत्तर सहेज लिए गए हैं। इन्हें डॉक्टर के डैशबोर्ड के साथ साझा करना एक आगामी संस्करण में जोड़ा जाएगा।",
      backToHome: "शुरुआत पर वापस जाएं",
    },
  },
} as const satisfies Record<Language, unknown>;
