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
      { value: "Vata", en: "Vata", hi: "वात" },
      { value: "Pitta", en: "Pitta", hi: "पित्त" },
      { value: "Kapha", en: "Kapha", hi: "कफ" },
      { value: "Mixed", en: "Mixed (Dvidoshaja/Tridoshaja)", hi: "मिश्रित" },
      { value: "Not reported", en: "Not sure / Not reported", hi: "पता नहीं / नहीं बताया" },
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
      { value: "Pravara (Excellent)", en: "Pravara (Excellent)", hi: "प्रवर (उत्तम)" },
      { value: "Madhyama (Moderate)", en: "Madhyama (Moderate)", hi: "मध्यम" },
      { value: "Avara (Lower)", en: "Avara (Lower)", hi: "अवर (न्यून)" },
      { value: "Not reported", en: "Not reported", hi: "नहीं बताया" },
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
      { value: "Pravara (Well built)", en: "Pravara (Well built)", hi: "प्रवर (अच्छी बनावट)" },
      { value: "Madhyama (Moderate)", en: "Madhyama (Moderate)", hi: "मध्यम (सामान्य बनावट)" },
      { value: "Avara (Lower)", en: "Avara (Lower)", hi: "अवर (कमज़ोर बनावट)" },
      { value: "Not reported", en: "Not reported", hi: "नहीं बताया" },
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
      { value: "Generally suited to usual diet", en: "Generally suited to usual diet", hi: "सामान्य आहार अनुकूल" },
      { value: "Mixed / varies", en: "Mixed / varies", hi: "मिश्रित / बदलता रहता है" },
      { value: "Sensitive to some foods or habits", en: "Sensitive to some foods or habits", hi: "कुछ भोजन या आदतों से संवेदनशील" },
      { value: "Not reported", en: "Not reported", hi: "नहीं बताया" },
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
      { value: "Generally stable", en: "Generally stable", hi: "सामान्यतः स्थिर" },
      { value: "Variable", en: "Variable", hi: "बदलता रहता है" },
      { value: "Currently disturbed", en: "Currently disturbed", hi: "वर्तमान में परेशान" },
      { value: "Not reported", en: "Not reported", hi: "नहीं बताया" },
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
      { value: "Low", en: "Low", hi: "कम" },
      { value: "Moderate", en: "Moderate", hi: "मध्यम" },
      { value: "Good", en: "Good", hi: "अच्छी" },
      { value: "Variable", en: "Variable", hi: "बदलती रहती है" },
      { value: "Not reported", en: "Not reported", hi: "नहीं बताया" },
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
      { value: "Low", en: "Low", hi: "कम" },
      { value: "Moderate", en: "Moderate", hi: "मध्यम" },
      { value: "Good", en: "Good", hi: "अच्छी" },
      { value: "Not reported", en: "Not reported", hi: "नहीं बताया" },
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
      { value: "Child", en: "Child", hi: "बाल्यावस्था" },
      { value: "Adult", en: "Adult", hi: "वयस्क" },
      { value: "Middle age", en: "Middle age", hi: "मध्य आयु" },
      { value: "Elderly", en: "Elderly", hi: "वृद्धावस्था" },
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
      { value: "Regular", en: "Regular", hi: "नियमित" },
      { value: "Constipation", en: "Constipation", hi: "कब्ज़" },
      { value: "Loose / frequent", en: "Loose / frequent", hi: "पतला / अधिक बार" },
      { value: "Variable", en: "Variable", hi: "बदलता रहता है" },
      { value: "Not reported", en: "Not reported", hi: "नहीं बताया" },
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
      { value: "Sama (Balanced)", en: "Sama (Balanced)", hi: "सम" },
      { value: "Vishama (Irregular)", en: "Vishama (Irregular)", hi: "विषम" },
      { value: "Tikshna (Intense)", en: "Tikshna (Intense)", hi: "तीक्ष्ण" },
      { value: "Manda (Sluggish)", en: "Manda (Sluggish)", hi: "मन्द" },
      { value: "Not sure", en: "Not sure", hi: "पता नहीं" },
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
      { value: "Mridu (Soft)", en: "Mridu (Soft)", hi: "मृदु" },
      { value: "Madhyama (Medium)", en: "Madhyama (Medium)", hi: "मध्यम" },
      { value: "Krura (Hard)", en: "Krura (Hard)", hi: "क्रूर" },
      { value: "Not sure", en: "Not sure", hi: "पता नहीं" },
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

  // Optional voice recognition - text input always works regardless
  const isSpeechSupported =
    typeof window !== "undefined" &&
    Boolean(
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition,
    );

  const startVoice = () => {
    if (!isSpeechSupported) return;

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

    if (!Ctor) return;

    try {
      const recognition = new Ctor();
      recognition.lang = language === "hi" ? "hi-IN" : "en-IN";

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript ?? "";
        if (transcript) {
          updateValue(transcript);
        }
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
    } catch {
      setListening(false);
    }
  };

  const saveAndContinue = () => {
    setAyushHistory(values);
    setShowSummary(true);
  };

  const finishAyush = () => {
    setAyushHistory(values);
    navigate("/patient/documents");
  };

  // Clean return to general intake without modifying general session data
  const returnToGeneral = () => {
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

    const answeredCount = Object.values(values).filter(
      (v) => v && v.trim() !== "" && v !== "Not reported",
    ).length;

    return (
      <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
        <div>
          <AppHeader />
          <main className="mx-auto max-w-4xl px-5 pb-20 pt-8">
            <div className="rounded-3xl border border-clinic-100 bg-white/95 p-6 shadow-sm glass-card sm:p-8">
              <div className="flex flex-col gap-2 border-b border-clinic-100 pb-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-clinic-600">
                  <span>🌿</span>
                  <span>AYUSH Mode · Ayurvedic Clinical History</span>
                </div>
                <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
                  {language === "hi"
                    ? "आयुर्वेदिक क्लिनिकल इतिहास सारांश"
                    : "Ayurvedic Clinical History Summary"}
                </h1>
                <p className="text-sm text-muted">
                  {language === "hi"
                    ? "संरचित रोगी-रिपोर्टेड डेटा (दशविध परीक्षा अनुरूप)। यह स्वचालित निदान नहीं करता; केवल चिकित्सक के संदर्भ हेतु है।"
                    : "Structured patient-reported capture for Ayurvedic OPDs (Dasavidha Pariksha aligned). Does not generate an automated diagnosis; provided for practitioner reference."}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded-full bg-clinic-100 px-3 py-1 text-xs font-semibold text-clinic-800">
                    {answeredCount} of {questions.length} fields recorded
                  </span>
                </div>
              </div>

              <div className="mt-8 space-y-6">
                {grouped.map(({ section, items }) => {
                  const sectionAnswered = items.filter((q) => values[q.id]);
                  return (
                    <section
                      key={section}
                      className="rounded-2xl border border-clinic-100 bg-clinic-50/30 p-5"
                    >
                      <div className="flex items-center justify-between border-b border-clinic-100 pb-2">
                        <h2 className="text-base font-semibold text-ink">
                          {section}
                        </h2>
                        <span className="text-xs text-muted">
                          {sectionAnswered.length} / {items.length}
                        </span>
                      </div>
                      <div className="mt-3 divide-y divide-slate-100">
                        {items.map((q) => (
                          <div
                            key={q.id}
                            className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between"
                          >
                            <div>
                              <p className="text-sm font-medium text-ink">
                                {language === "hi" ? q.labelHi : q.label}
                              </p>
                              <p className="text-xs text-muted">
                                {language === "hi" ? q.helpHi : q.help}
                              </p>
                            </div>
                            <p className="max-w-xl text-sm font-medium text-clinic-800 sm:text-right">
                              {displayValue(q)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-clinic-100 pt-6">
                <button
                  type="button"
                  onClick={() => setShowSummary(false)}
                  className="rounded-full border border-clinic-200 px-6 py-3 text-sm font-medium text-muted hover:bg-clinic-50 transition"
                >
                  {language === "hi" ? "← वापस संपादित करें" : "← Back to edit"}
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={returnToGeneral}
                    className="rounded-full border border-clinic-200 px-5 py-3 text-sm font-medium text-clinic-700 hover:bg-clinic-50 transition"
                  >
                    {language === "hi" ? "सामान्य इंटेक पर लौटें" : "Return to General Intake"}
                  </button>
                  <button
                    type="button"
                    onClick={finishAyush}
                    className="rounded-full bg-clinic-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-clinic-700 transition"
                  >
                    {language === "hi"
                      ? "सारांश सेव करें और आगे बढ़ें →"
                      : "Save Ayurvedic History & Continue →"}
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>

        <footer className="py-6 text-center text-xs text-muted">
          Sehat Saathi · SIH26047 · AYUSH Mode — Ayurvedic Clinical History
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader />

        <main className="mx-auto max-w-3xl px-5 pb-20 pt-8">
          <div className="rounded-3xl border border-clinic-100 bg-white/95 p-6 shadow-sm glass-card sm:p-8">
            {/* Top Navigation & Status */}
            <div className="flex items-center justify-between gap-4 border-b border-clinic-100 pb-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-clinic-600">
                  <span>🌿</span>
                  <span>AYUSH Mode · Ayurvedic Clinical History</span>
                </div>
                <h1 className="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">
                  {language === "hi"
                    ? "आयुर्वेदिक क्लिनिकल इतिहास"
                    : "Ayurvedic Clinical History Intake"}
                </h1>
              </div>

              <div className="text-right">
                <span className="rounded-full bg-clinic-100 px-3 py-1 text-xs font-semibold text-clinic-800">
                  {index + 1} / {questions.length}
                </span>
              </div>
            </div>

            {/* Non-diagnostic Practitioner Reference Notice */}
            <div className="mt-4 rounded-xl border border-clinic-100 bg-clinic-50/50 p-3.5 text-xs text-muted">
              <span className="font-semibold text-clinic-800">
                {language === "hi" ? "सूचना:" : "Clinical Scope:"}
              </span>{" "}
              {language === "hi"
                ? "यह मॉड्यूल पारंपरिक आयुर्वेदिक इतिहास (दशविध परीक्षा अनुरूप) दर्ज करता है। यह स्वायत्त निदान नहीं करता; केवल चिकित्सक के परामर्श संदर्भ हेतु है।"
                : "Captures patient-reported Ayurvedic clinical history for practitioner reference. Does not generate an automated diagnosis or medicinal prescription."}
            </div>

            {/* Progress Bar */}
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-clinic-50">
              <div
                className="h-full rounded-full bg-clinic-600 transition-all duration-300"
                style={{
                  width: `${((index + 1) / questions.length) * 100}%`,
                }}
              />
            </div>

            {/* Section Tag */}
            <div className="mt-6 flex items-center justify-between rounded-xl bg-clinic-50/80 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-clinic-700">
                {question.section}
              </span>
              <span className="text-xs text-muted">
                Section {currentSectionIndex + 1} of {sections.length}
              </span>
            </div>

            {/* Active Question Box */}
            <div className="mt-6">
              <h2 className="text-xl font-semibold text-ink sm:text-2xl">
                {language === "hi" ? question.labelHi : question.label}
              </h2>

              {(language === "hi" ? question.helpHi : question.help) && (
                <p className="mt-1.5 text-sm text-muted">
                  {language === "hi" ? question.helpHi : question.help}
                </p>
              )}

              {/* Multiple-choice options */}
              {question.type === "select" && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {(question.options ?? []).map((option) => {
                    const isSelected = value === option.value;
                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => updateValue(option.value)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? "border-clinic-600 bg-clinic-600 text-white shadow-sm"
                            : "border-clinic-200 bg-white text-clinic-800 hover:border-clinic-400 hover:bg-clinic-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">
                            {language === "hi" ? option.hi : option.en}
                          </span>
                          {isSelected && <span className="text-sm">✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Free text entry */}
              {question.type === "text" && (
                <textarea
                  value={value}
                  onChange={(event) => updateValue(event.target.value)}
                  rows={4}
                  className="mt-6 w-full rounded-2xl border border-clinic-200 p-4 text-sm text-ink focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-100 transition"
                  placeholder={
                    language === "hi"
                      ? "यहाँ लिखें या नीचे विकल्प चुनें…"
                      : "Type your observation or symptom details here…"
                  }
                />
              )}

              {/* Auxiliary Quick Buttons: Optional Voice & Not Reported */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {isSpeechSupported && (
                  <button
                    type="button"
                    onClick={startVoice}
                    className={`rounded-full border px-5 py-2.5 text-xs font-semibold transition ${
                      listening
                        ? "border-red-500 bg-red-50 text-red-700 animate-pulse"
                        : "border-clinic-200 bg-white text-clinic-700 hover:bg-clinic-50"
                    }`}
                  >
                    {listening ? "🎙 Listening…" : "🎙 Speak answer (optional)"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => updateValue("Not reported")}
                  className={`rounded-full border px-4 py-2.5 text-xs font-medium transition ${
                    value === "Not reported"
                      ? "border-clinic-500 bg-clinic-100 text-clinic-900"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {language === "hi" ? "नहीं बताया" : "Not reported"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowSummary(true)}
                  className="ml-auto text-xs font-medium text-clinic-700 hover:underline"
                >
                  {language === "hi" ? "सारांश देखें →" : "View full summary →"}
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-clinic-100 pt-6">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={previous}
                  disabled={index === 0}
                  className="rounded-full border border-clinic-200 px-5 py-2.5 text-sm font-medium text-muted hover:bg-clinic-50 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  {language === "hi" ? "← पिछला" : "← Back"}
                </button>
                <button
                  type="button"
                  onClick={returnToGeneral}
                  className="rounded-full border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                  title="Return to general consultation workflow without losing progress"
                >
                  {language === "hi" ? "सामान्य इंटेक" : "General Intake"}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={next}
                  className="rounded-full bg-clinic-600 px-7 py-3 text-sm font-semibold text-white shadow-sm hover:bg-clinic-700 transition"
                >
                  {index === questions.length - 1
                    ? language === "hi"
                      ? "सारांश देखें"
                      : "View Summary"
                    : language === "hi"
                    ? "आगे बढ़ें →"
                    : "Continue →"}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · AYUSH Mode — Ayurvedic Clinical History
      </footer>
    </div>
  );
}
