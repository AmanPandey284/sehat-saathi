import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { useLanguage } from "../i18n/LanguageContext";
import { usePatientSession } from "../features/patient/state/PatientSessionContext";

type Question = {
  id: string;
  section: string;
  label: string;
  labelHi: string;
  help?: string;
  helpHi?: string;
  type: "select" | "text";
  options?: { value: string; en: string; hi: string }[];
};

const questions: Question[] = [
  // ---------------------------------------------------------
  // DASHAVIDHA PARIKSHA
  // ---------------------------------------------------------
  {
    id: "prakriti",
    section: "Dashavidha Pariksha",
    label: "Prakriti",
    labelHi: "प्रकृति",
    help: "Usual constitution / baseline nature",
    helpHi: "सामान्य प्रकृति / शरीर की मूल प्रवृत्ति",
    type: "select",
    options: [
      { value: "vata", en: "Vata", hi: "वात" },
      { value: "pitta", en: "Pitta", hi: "पित्त" },
      { value: "kapha", en: "Kapha", hi: "कफ" },
      { value: "mixed", en: "Mixed", hi: "मिश्रित" },
      { value: "not_reported", en: "Not sure / Not reported", hi: "पता नहीं / नहीं बताया" },
    ],
  },
  {
    id: "vikriti",
    section: "Dashavidha Pariksha",
    label: "Vikriti",
    labelHi: "विकृति",
    help: "Current changes from your usual health",
    helpHi: "सामान्य स्वास्थ्य से वर्तमान बदलाव",
    type: "text",
  },
  {
    id: "sara",
    section: "Dashavidha Pariksha",
    label: "Sara",
    labelHi: "सार",
    help: "Quality of body tissues as reported or assessed",
    helpHi: "शरीर के ऊतकों की गुणवत्ता",
    type: "select",
    options: [
      { value: "pravara", en: "Pravara (Excellent)", hi: "प्रवर (उत्तम)" },
      { value: "madhyama", en: "Madhyama (Moderate)", hi: "मध्यम" },
      { value: "avara", en: "Avara (Lower)", hi: "अवर (न्यून)" },
      { value: "not_reported", en: "Not reported", hi: "नहीं बताया" },
    ],
  },
  {
    id: "samhanana",
    section: "Dashavidha Pariksha",
    label: "Samhanana",
    labelHi: "संहनन",
    help: "Body compactness / physical build",
    helpHi: "शरीर की सुदृढ़ता और बनावट",
    type: "select",
    options: [
      { value: "pravara", en: "Pravara (Well built)", hi: "प्रवर (अच्छी बनावट)" },
      { value: "madhyama", en: "Madhyama (Moderate)", hi: "मध्यम (सामान्य बनावट)" },
      { value: "avara", en: "Avara (Lower)", hi: "अवर (कमज़ोर बनावट)" },
      { value: "not_reported", en: "Not reported", hi: "नहीं बताया" },
    ],
  },
  {
    id: "pramana",
    section: "Dashavidha Pariksha",
    label: "Pramana",
    labelHi: "प्रमाण",
    help: "Body measurements and proportions, if known",
    helpHi: "शरीर के माप और अनुपात, यदि ज्ञात हों",
    type: "text",
  },
  {
    id: "satmya",
    section: "Dashavidha Pariksha",
    label: "Satmya",
    labelHi: "सात्म्य",
    help: "Food, habits and routines that suit you",
    helpHi: "अनुकूल भोजन, आदतें और दिनचर्या",
    type: "select",
    options: [
      { value: "ahara_satmya", en: "Generally suited to usual diet", hi: "सामान्य आहार अनुकूल" },
      { value: "mixed", en: "Mixed / varies", hi: "मिश्रित / बदलता रहता है" },
      { value: "sensitive", en: "Sensitive to some foods or habits", hi: "कुछ भोजन या आदतों से संवेदनशील" },
      { value: "not_reported", en: "Not reported", hi: "नहीं बताया" },
    ],
  },
  {
    id: "sattva",
    section: "Dashavidha Pariksha",
    label: "Sattva",
    labelHi: "सत्त्व",
    help: "Mental disposition as reported by the patient",
    helpHi: "रोगी द्वारा बताया गया मानसिक स्वभाव",
    type: "select",
    options: [
      { value: "stable", en: "Generally stable", hi: "सामान्यतः स्थिर" },
      { value: "variable", en: "Variable", hi: "बदलता रहता है" },
      { value: "disturbed", en: "Currently disturbed", hi: "वर्तमान में परेशान" },
      { value: "not_reported", en: "Not reported", hi: "नहीं बताया" },
    ],
  },
  {
    id: "ahara_shakti",
    section: "Dashavidha Pariksha",
    label: "Ahara Shakti",
    labelHi: "आहार शक्ति",
    help: "Appetite and digestive intake capacity",
    helpHi: "भूख और भोजन ग्रहण करने की क्षमता",
    type: "select",
    options: [
      { value: "low", en: "Low", hi: "कम" },
      { value: "moderate", en: "Moderate", hi: "मध्यम" },
      { value: "good", en: "Good", hi: "अच्छी" },
      { value: "variable", en: "Variable", hi: "बदलती रहती है" },
      { value: "not_reported", en: "Not reported", hi: "नहीं बताया" },
    ],
  },
  {
    id: "vyayama_shakti",
    section: "Dashavidha Pariksha",
    label: "Vyayama Shakti",
    labelHi: "व्यायाम शक्ति",
    help: "Exercise / activity capacity",
    helpHi: "व्यायाम / गतिविधि की क्षमता",
    type: "select",
    options: [
      { value: "low", en: "Low", hi: "कम" },
      { value: "moderate", en: "Moderate", hi: "मध्यम" },
      { value: "good", en: "Good", hi: "अच्छी" },
      { value: "not_reported", en: "Not reported", hi: "नहीं बताया" },
    ],
  },
  {
    id: "vaya",
    section: "Dashavidha Pariksha",
    label: "Vaya",
    labelHi: "वय",
    help: "Life stage / age",
    helpHi: "जीवन अवस्था / आयु",
    type: "select",
    options: [
      { value: "child", en: "Child", hi: "बाल्यावस्था" },
      { value: "adult", en: "Adult", hi: "वयस्क" },
      { value: "middle_age", en: "Middle age", hi: "मध्य आयु" },
      { value: "elderly", en: "Elderly", hi: "वृद्धावस्था" },
    ],
  },

  // ---------------------------------------------------------
  // ASHTAVIDHA PARIKSHA
  // ---------------------------------------------------------
  {
    id: "nadi",
    section: "Ashtavidha Pariksha",
    label: "Nadi",
    labelHi: "नाड़ी",
    help: "Pulse / Nadi observation, if known",
    helpHi: "नाड़ी की जानकारी, यदि उपलब्ध हो",
    type: "text",
  },
  {
    id: "mala",
    section: "Ashtavidha Pariksha",
    label: "Mala",
    labelHi: "मल",
    help: "Bowel pattern",
    helpHi: "मल त्याग की सामान्य स्थिति",
    type: "select",
    options: [
      { value: "regular", en: "Regular", hi: "नियमित" },
      { value: "constipation", en: "Constipation", hi: "कब्ज़" },
      { value: "loose", en: "Loose / frequent", hi: "पतला / अधिक बार" },
      { value: "variable", en: "Variable", hi: "बदलता रहता है" },
      { value: "not_reported", en: "Not reported", hi: "नहीं बताया" },
    ],
  },
  {
    id: "mutra",
    section: "Ashtavidha Pariksha",
    label: "Mutra",
    labelHi: "मूत्र",
    help: "Urination pattern",
    helpHi: "मूत्र त्याग की स्थिति",
    type: "text",
  },
  {
    id: "jihva",
    section: "Ashtavidha Pariksha",
    label: "Jihva",
    labelHi: "जिह्वा",
    help: "Tongue observation, if known",
    helpHi: "जिह्वा की जानकारी, यदि उपलब्ध हो",
    type: "text",
  },
  {
    id: "shabda",
    section: "Ashtavidha Pariksha",
    label: "Shabda",
    labelHi: "शब्द",
    help: "Voice / speech observation",
    helpHi: "आवाज़ / बोलने से संबंधित जानकारी",
    type: "text",
  },
  {
    id: "sparsha",
    section: "Ashtavidha Pariksha",
    label: "Sparsha",
    labelHi: "स्पर्श",
    help: "Touch / skin observation, if known",
    helpHi: "स्पर्श / त्वचा संबंधी जानकारी",
    type: "text",
  },
  {
    id: "drik",
    section: "Ashtavidha Pariksha",
    label: "Drik",
    labelHi: "दृक्",
    help: "Eye / visual observation, if known",
    helpHi: "आंख / दृष्टि संबंधी जानकारी",
    type: "text",
  },
  {
    id: "akriti",
    section: "Ashtavidha Pariksha",
    label: "Akriti",
    labelHi: "आकृति",
    help: "Overall appearance / body form",
    helpHi: "समग्र शारीरिक बनावट",
    type: "text",
  },

  // ---------------------------------------------------------
  // AGNI + KOSHTHA
  // ---------------------------------------------------------
  {
    id: "agni",
    section: "Agni & Koshtha",
    label: "Agni",
    labelHi: "अग्नि",
    help: "Digestive pattern",
    helpHi: "पाचन की स्थिति",
    type: "select",
    options: [
      { value: "sama", en: "Sama", hi: "सम" },
      { value: "vishama", en: "Vishama", hi: "विषम" },
      { value: "tikshna", en: "Tikshna", hi: "तीक्ष्ण" },
      { value: "manda", en: "Manda", hi: "मन्द" },
      { value: "not_sure", en: "Not sure", hi: "पता नहीं" },
    ],
  },
  {
    id: "koshtha",
    section: "Agni & Koshtha",
    label: "Koshtha",
    labelHi: "कोष्ठ",
    help: "Bowel tendency as reported",
    helpHi: "मल त्याग की प्रवृत्ति",
    type: "select",
    options: [
      { value: "mridu", en: "Mridu", hi: "मृदु" },
      { value: "madhyama", en: "Madhyama", hi: "मध्यम" },
      { value: "krura", en: "Krura", hi: "क्रूर" },
      { value: "not_sure", en: "Not sure", hi: "पता नहीं" },
    ],
  },

  // ---------------------------------------------------------
  // AHARA - VIHARA
  // ---------------------------------------------------------
  {
    id: "meal_pattern",
    section: "Ahara–Vihara",
    label: "Meal pattern",
    labelHi: "भोजन का तरीका",
    help: "Meal timing and regularity",
    helpHi: "भोजन का समय और नियमितता",
    type: "text",
  },
  {
    id: "food_habits",
    section: "Ahara–Vihara",
    label: "Food habits",
    labelHi: "भोजन की आदतें",
    help: "Typical foods and dietary habits",
    helpHi: "सामान्य भोजन और आहार की आदतें",
    type: "text",
  },
  {
    id: "water_intake",
    section: "Ahara–Vihara",
    label: "Water intake",
    labelHi: "पानी का सेवन",
    help: "Usual daily water intake",
    helpHi: "प्रतिदिन सामान्य पानी का सेवन",
    type: "text",
  },
  {
    id: "sleep",
    section: "Ahara–Vihara",
    label: "Sleep",
    labelHi: "नींद",
    help: "Sleep duration and quality",
    helpHi: "नींद की अवधि और गुणवत्ता",
    type: "text",
  },
  {
    id: "exercise",
    section: "Ahara–Vihara",
    label: "Exercise / activity",
    labelHi: "व्यायाम / गतिविधि",
    help: "Daily physical activity",
    helpHi: "दैनिक शारीरिक गतिविधि",
    type: "text",
  },
  {
    id: "daily_routine",
    section: "Ahara–Vihara",
    label: "Daily routine",
    labelHi: "दैनिक दिनचर्या",
    help: "Typical daily routine",
    helpHi: "सामान्य दैनिक दिनचर्या",
    type: "text",
  },

  // ---------------------------------------------------------
  // NIDANA PANCHAKA
  // ---------------------------------------------------------
  {
    id: "nidana",
    section: "Nidana Panchaka",
    label: "Nidana",
    labelHi: "निदान",
    help: "Possible triggers or causative factors reported by the patient",
    helpHi: "रोगी द्वारा बताए गए संभावित कारण या ट्रिगर",
    type: "text",
  },
  {
    id: "purvarupa",
    section: "Nidana Panchaka",
    label: "Purvarupa",
    labelHi: "पूर्वरूप",
    help: "Symptoms noticed before the main complaint",
    helpHi: "मुख्य शिकायत से पहले दिखने वाले लक्षण",
    type: "text",
  },
  {
    id: "rupa",
    section: "Nidana Panchaka",
    label: "Rupa",
    labelHi: "रूप",
    help: "Current symptoms/signs reported by the patient",
    helpHi: "रोगी द्वारा बताए गए वर्तमान लक्षण",
    type: "text",
  },
  {
    id: "upashaya",
    section: "Nidana Panchaka",
    label: "Upashaya",
    labelHi: "उपशय",
    help: "Things that relieve the symptoms",
    helpHi: "जिन चीज़ों से लक्षण में राहत मिलती है",
    type: "text",
  },
  {
    id: "anupashaya",
    section: "Nidana Panchaka",
    label: "Anupashaya",
    labelHi: "अनुपशय",
    help: "Things that worsen the symptoms",
    helpHi: "जिन चीज़ों से लक्षण बढ़ते हैं",
    type: "text",
  },

  // ---------------------------------------------------------
  // SAMPRAPTI-RELATED HISTORY
  // ---------------------------------------------------------
  {
    id: "dosha_history",
    section: "Samprapti",
    label: "Dosha-related history",
    labelHi: "दोष संबंधी जानकारी",
    help: "Patient/practitioner-reported information only",
    helpHi: "केवल रोगी/चिकित्सक द्वारा दी गई जानकारी",
    type: "text",
  },
  {
    id: "dushya_history",
    section: "Samprapti",
    label: "Dushya-related history",
    labelHi: "दुष्य संबंधी जानकारी",
    help: "Patient/practitioner-reported information only",
    helpHi: "केवल रोगी/चिकित्सक द्वारा दी गई जानकारी",
    type: "text",
  },
  {
    id: "srotas_history",
    section: "Samprapti",
    label: "Srotas-related history",
    labelHi: "स्रोतस संबंधी जानकारी",
    help: "Patient/practitioner-reported information only",
    helpHi: "केवल रोगी/चिकित्सक द्वारा दी गई जानकारी",
    type: "text",
  },
  {
    id: "udbhava_sthana",
    section: "Samprapti",
    label: "Udbhava Sthana",
    labelHi: "उद्भव स्थान",
    help: "Origin/site information when known",
    helpHi: "ज्ञात होने पर उत्पत्ति/स्थान की जानकारी",
    type: "text",
  },
  {
    id: "roga_marga",
    section: "Samprapti",
    label: "Rogamarga",
    labelHi: "रोगमार्ग",
    help: "Route/pathway information when known",
    helpHi: "ज्ञात होने पर मार्ग संबंधी जानकारी",
    type: "text",
  },
];

export default function AyushMode() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { ayushHistory, setAyushHistory } = usePatientSession();

  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(
    ayushHistory ?? {},
  );
  const [listening, setListening] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const question = questions[index];

  const sections = useMemo(
    () => [...new Set(questions.map((q) => q.section))],
    [],
  );

  const currentSectionIndex = sections.indexOf(question.section);

  const value = values[question.id] ?? "";

  const updateValue = (next: string) => {
    setValues((prev) => ({
      ...prev,
      [question.id]: next,
    }));
  };

  const startVoice = () => {
    type SpeechRecognitionConstructor = new () => any;

    const Ctor =
      (
        window as unknown as {
          SpeechRecognition?: SpeechRecognitionConstructor;
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        }
      ).webkitSpeechRecognition;

    if (!Ctor) {
      return;
    }

    const recognition = new Ctor();

    recognition.lang = language === "hi" ? "hi-IN" : "en-IN";

    recognition.onresult = (event: any) => {
      const transcript =
        event.results?.[0]?.[0]?.transcript ?? "";

      updateValue(transcript);
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    setListening(true);
    recognition.start();
  };

  const saveAndContinue = () => {
    setAyushHistory(values);
    setShowSummary(true);
  };

  const finishAyush = () => {
    setAyushHistory(values);
    navigate("/patient/documents");
  };

  const displayValue = (q: Question) => {
    const raw = values[q.id] ?? "";
    if (!raw) return language === "hi" ? "नहीं बताया" : "Not reported";

    const option = q.options?.find((item) => item.value === raw);
    return option
      ? language === "hi"
        ? option.hi
        : option.en
      : raw;
  };

  const next = () => {
    if (index < questions.length - 1) {
      setIndex((current) => current + 1);
      return;
    }

    saveAndContinue();
  };

  const previous = () => {
    if (index > 0) {
      setIndex((current) => current - 1);
    }
  };

  if (showSummary) {
    const grouped = sections.map((section) => ({
      section,
      items: questions.filter((q) => q.section === section),
    }));

    return (
      <div className="min-h-screen bg-canvas">
        <AppHeader />
        <main className="mx-auto max-w-4xl px-5 pb-20 pt-8">
          <div className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-clinic-500">
                {language === "hi" ? "आयुष सारांश" : "AYUSH Clinical Summary"}
              </p>
              <h1 className="font-display text-3xl font-semibold text-ink">
                {language === "hi"
                  ? "आपकी आयुष जानकारी तैयार है"
                  : "Your AYUSH history is ready"}
              </h1>
              <p className="text-sm text-muted">
                {language === "hi"
                  ? "यह केवल आपकी दी गई जानकारी का संरचित सारांश है। यह स्वयं कोई निदान नहीं करता।"
                  : "This is a structured summary of the information you provided. It does not generate a diagnosis."}
              </p>
            </div>

            <div className="mt-8 space-y-6">
              {grouped.map(({ section, items }) => (
                <section key={section} className="rounded-xl border border-clinic-100 p-4">
                  <h2 className="text-lg font-semibold text-ink">{section}</h2>
                  <div className="mt-3 divide-y divide-slate-100">
                    {items.map((q) => (
                      <div
                        key={q.id}
                        className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-ink">
                            {language === "hi" ? q.labelHi : q.label}
                          </p>
                          <p className="text-xs text-muted">
                            {language === "hi" ? q.helpHi : q.help}
                          </p>
                        </div>
                        <p className="max-w-xl text-sm font-medium text-clinic-700 sm:text-right">
                          {displayValue(q)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowSummary(false)}
                className="rounded-full border border-clinic-200 px-6 py-3 text-sm text-muted"
              >
                {language === "hi" ? "वापस संपादित करें" : "Back to edit"}
              </button>
              <button
                type="button"
                onClick={finishAyush}
                className="rounded-full bg-clinic-600 px-7 py-3 text-sm font-medium text-white"
              >
                {language === "hi"
                  ? "सारांश सेव करें और आगे बढ़ें"
                  : "Save summary & continue"}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-5 pb-20 pt-8">
        <div className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-clinic-500">
                AYUSH history mode
              </p>

              <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
                {language === "hi"
                  ? "विस्तृत आयुष इतिहास"
                  : "Extended AYUSH History"}
              </h1>

              <p className="mt-2 text-sm text-muted">
                {language === "hi"
                  ? "यह आपकी जानकारी को संरचित करता है। यह स्वयं कोई निदान नहीं करता।"
                  : "This captures and structures your history. It does not generate a diagnosis."}
              </p>
            </div>

            <div className="rounded-full bg-clinic-50 px-3 py-2 text-xs font-semibold text-clinic-800">
              {index + 1} / {questions.length}
            </div>
          </div>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-clinic-50">
            <div
              className="h-full rounded-full bg-clinic-600 transition-all"
              style={{
                width: `${((index + 1) / questions.length) * 100}%`,
              }}
            />
          </div>

          <div className="mt-8 rounded-xl bg-clinic-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-clinic-600">
              {currentSectionIndex + 1} / {sections.length}
            </p>

            <h2 className="mt-1 text-lg font-semibold text-ink">
              {question.section}
            </h2>
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-clinic-500">
              {language === "hi"
                ? question.labelHi
                : question.label}
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-ink">
              {language === "hi"
                ? question.labelHi
                : question.label}
            </h2>

            {(language === "hi"
              ? question.helpHi
              : question.help) && (
              <p className="mt-2 text-sm text-muted">
                {language === "hi"
                  ? question.helpHi
                  : question.help}
              </p>
            )}

            {question.type === "select" && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {(question.options ?? []).map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => updateValue(option.value)}
                    className={`rounded-xl border p-4 text-left transition ${
                      value === option.value
                        ? "border-clinic-600 bg-clinic-600 text-white"
                        : "border-clinic-200 bg-white text-clinic-700 hover:bg-clinic-50"
                    }`}
                  >
                    <span className="font-medium">
                      {language === "hi"
                        ? option.hi
                        : option.en}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {question.type === "text" && (
              <textarea
                value={value}
                onChange={(event) =>
                  updateValue(event.target.value)
                }
                rows={5}
                className="mt-6 w-full rounded-xl border border-clinic-200 p-4 text-base outline-none focus:border-clinic-600"
                placeholder={
                  language === "hi"
                    ? "यहाँ लिखें या नीचे बोलें…"
                    : "Type here or use voice input…"
                }
              />
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startVoice}
                className="rounded-full border border-clinic-200 px-5 py-3 text-sm font-medium text-clinic-700"
              >
                {listening ? "Listening…" : "🎙 Speak answer"}
              </button>

              {!value && (
                <button
                  type="button"
                  onClick={() => updateValue("Not reported")}
                  className="rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-600"
                >
                  Not reported
                </button>
              )}
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={previous}
              disabled={index === 0}
              className="rounded-full border border-clinic-200 px-6 py-3 text-sm text-muted disabled:opacity-40"
            >
              Back
            </button>

            <button
              type="button"
              onClick={next}
              disabled={!value.trim()}
              className="rounded-full bg-clinic-600 px-7 py-3 text-sm font-medium text-white disabled:opacity-40"
            >
              {index === questions.length - 1
                ? "Save AYUSH history"
                : "Continue"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}