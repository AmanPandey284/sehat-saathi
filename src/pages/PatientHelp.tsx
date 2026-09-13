import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { useLanguage } from "../i18n/LanguageContext";

interface StepGuide {
  number: number;
  icon: string;
  titleEn: string;
  titleHi: string;
  explainEn: string;
  explainHi: string;
}

const STEPS: StepGuide[] = [
  {
    number: 1,
    icon: "🌱",
    titleEn: "Choose how you want to continue",
    titleHi: "चुनें कि आप कैसे आगे बढ़ना चाहते हैं",
    explainEn:
      "Choose New Patient if this is your first visit. Choose Existing Patient if you have visited before.",
    explainHi:
      "यदि आप पहली बार अस्पताल आए हैं तो नया मरीज चुनें। यदि आप पहले आ चुके हैं तो पुराना मरीज चुनें।",
  },
  {
    number: 2,
    icon: "🗣️",
    titleEn: "Tell us what brings you here",
    titleHi: "बताएं कि आज आप किसलिए आए हैं",
    explainEn: "Select the problem or reason for today's visit.",
    explainHi: "आज के परामर्श का मुख्य कारण या अपनी तकलीफ चुनें।",
  },
  {
    number: 3,
    icon: "🩺",
    titleEn: "Answer the questions",
    titleHi: "सवालों के सरल जवाब दें",
    explainEn:
      "Answer the questions about your current problem. You can use the available input options, including voice when supported.",
    explainHi:
      "अपनी समस्या से जुड़े आसान सवालों के जवाब दें। आप बोलकर या स्क्रीन पर छूकर जवाब दे सकते हैं।",
  },
  {
    number: 4,
    icon: "📄",
    titleEn: "Upload your reports",
    titleHi: "अपनी जांच रिपोर्ट व पर्चे जोड़ें",
    explainEn:
      "Add your prescription, laboratory report, scan or other medical document.",
    explainHi:
      "अपना पुराना डॉक्टर का पर्चा, खून की जांच रिपोर्ट या स्कैन जोड़ें।",
  },
  {
    number: 5,
    icon: "✅",
    titleEn: "Review before continuing",
    titleHi: "आगे बढ़ने से पहले समीक्षा करें",
    explainEn:
      "Check the information and make corrections before continuing to your doctor.",
    explainHi:
      "डॉक्टर की कतार में जाने से पहले अपनी जानकारी जांचें और जरूरत पड़ने पर सुधार करें।",
  },
];

export default function PatientHelp() {
  const nav = useNavigate();
  const { language } = useLanguage();

  const [activeTab, setActiveTab] = useState<"guide" | "video">("guide");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const currentStep = STEPS[currentStepIndex];

  // Stop speech synthesis on unmount or step change
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentStepIndex, activeTab]);

  const handleSpeakStep = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const title = language === "hi" ? currentStep.titleHi : currentStep.titleEn;
    const explain = language === "hi" ? currentStep.explainHi : currentStep.explainEn;
    const textToRead = `${title}. ${explain}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 0.85; // Calibrated for clarity and elderly users
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      nav("/patient/entry");
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader showStatus={false} />

        <main className="mx-auto max-w-3xl px-6 pb-20 pt-8">
          {/* Top Back Action */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => nav(-1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition"
            >
              ← {language === "hi" ? "वापस जाएं" : "Go Back"}
            </button>
          </div>

          <div className="rounded-3xl border border-clinic-100 bg-white/95 p-7 shadow-sm sm:p-10 glass-card">
            
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-clinic-100 pb-5">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-clinic-100 text-2xl text-clinic-700 shadow-2xs">
                  🤝
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-clinic-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-clinic-700">
                      {language === "hi" ? "मरीज सहायता केंद्र" : "Patient Support"}
                    </span>
                    <span className="text-[10px] text-muted font-medium">
                      Sehat Saathi Sahayak
                    </span>
                  </div>
                  <h1 className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">
                    {language === "hi" ? "सेहत साथी का उपयोग कैसे करें" : "How to Use Sehat Saathi"}
                  </h1>
                </div>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                {language === "hi" ? "सहायता का प्रकार चुनें:" : "Choose how you'd like help:"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("guide")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 text-sm font-semibold transition ${
                    activeTab === "guide"
                      ? "border-clinic-600 bg-clinic-600 text-white shadow-sm"
                      : "border-clinic-200 bg-white text-ink hover:border-clinic-400"
                  }`}
                >
                  <span className="text-base">📖</span>
                  <span>{language === "hi" ? "चरण सीखें" : "Show Me How"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("video")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 text-sm font-semibold transition ${
                    activeTab === "video"
                      ? "border-clinic-600 bg-clinic-600 text-white shadow-sm"
                      : "border-clinic-200 bg-white text-ink hover:border-clinic-400"
                  }`}
                >
                  <span className="text-base">▶</span>
                  <span>{language === "hi" ? "डेमो देखें" : "Watch Demo"}</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Step-by-Step Interactive Guide */}
            {activeTab === "guide" && (
              <div className="mt-8">
                {/* Step Navigation Pill */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-clinic-700">
                    {language === "hi"
                      ? `चरण ${currentStep.number} / ${STEPS.length}`
                      : `Step ${currentStep.number} of ${STEPS.length}`}
                  </span>
                  
                  {/* Step dots */}
                  <div className="flex gap-1.5" aria-hidden>
                    {STEPS.map((s, idx) => (
                      <button
                        key={s.number}
                        type="button"
                        onClick={() => setCurrentStepIndex(idx)}
                        className={`h-2.5 rounded-full transition-all ${
                          idx === currentStepIndex
                            ? "w-6 bg-clinic-600"
                            : "w-2.5 bg-clinic-200 hover:bg-clinic-400"
                        }`}
                        aria-label={`Go to step ${s.number}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Step Card */}
                <div className="mt-4 rounded-3xl border-2 border-clinic-100 bg-clinic-50/50 p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-clinic-200 text-3xl shadow-sm">
                      {currentStep.icon}
                    </span>
                    <span className="font-display text-4xl font-bold text-clinic-300">
                      0{currentStep.number}
                    </span>
                  </div>

                  <h2 className="mt-5 font-display text-xl font-bold text-ink sm:text-2xl">
                    {language === "hi" ? currentStep.titleHi : currentStep.titleEn}
                  </h2>

                  <p className="mt-3 text-base leading-relaxed text-ink/90 sm:text-lg">
                    {language === "hi" ? currentStep.explainHi : currentStep.explainEn}
                  </p>

                  {/* Audio Listen Button */}
                  <div className="mt-6 pt-5 border-t border-clinic-200/60">
                    {typeof window !== "undefined" && "speechSynthesis" in window ? (
                      <button
                        type="button"
                        onClick={handleSpeakStep}
                        className="inline-flex items-center gap-2 rounded-xl border border-clinic-300 bg-white px-4 py-2.5 text-xs font-bold text-clinic-800 shadow-2xs hover:bg-clinic-100 hover:border-clinic-400 transition"
                      >
                        <span className="text-sm">{isSpeaking ? "⏹️" : "🔊"}</span>
                        <span>
                          {isSpeaking
                            ? language === "hi"
                              ? "आवाज रोकें"
                              : "Stop Listening"
                            : language === "hi"
                              ? "निर्देश सुनें (Listen)"
                              : "Listen to Instructions"}
                        </span>
                      </button>
                    ) : (
                      <p className="text-xs text-muted">
                        {language === "hi"
                          ? "इस ब्राउज़र में ऑडियो उपलब्ध नहीं है।"
                          : "Audio playback is not supported in this browser."}
                      </p>
                    )}
                  </div>
                </div>

                {/* Step Actions */}
                <div className="mt-8 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentStepIndex === 0}
                    className="rounded-full border border-clinic-200 bg-white px-6 py-3 text-sm font-semibold text-ink shadow-2xs hover:bg-clinic-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← {language === "hi" ? "पिछला" : "Back"}
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="rounded-full bg-clinic-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-clinic-700 transition"
                  >
                    {currentStepIndex === STEPS.length - 1
                      ? language === "hi"
                        ? "परामर्श शुरू करें →"
                        : "Start Consultation →"
                      : language === "hi"
                        ? "अगला चरण →"
                        : "Next Step →"}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Watch Demo Video Placeholder */}
            {activeTab === "video"}
            {activeTab === "video" && (
              <div className="mt-8">
                <div className="rounded-3xl border-2 border-dashed border-clinic-300 bg-clinic-50/40 p-8 text-center sm:p-12">
                  <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-clinic-200 text-3xl shadow-sm mb-4">
                    🎬
                  </span>

                  <h3 className="font-display text-xl font-bold text-ink sm:text-2xl">
                    {language === "hi" ? "डेमो वीडियो जल्द आ रहा है" : "Demo Video Coming Soon"}
                  </h3>

                  <p className="mt-2 max-w-md mx-auto text-sm text-muted leading-relaxed">
                    {language === "hi"
                      ? "एक वास्तविक मरीज द्वारा सेहत साथी का उपयोग करने का सरल वीडियो यहां उपलब्ध होगा। अभी के लिए आप ऊपर दिए गए 'चरण सीखें' विकल्प का उपयोग कर सकते हैं।"
                      : "A clean walkthrough showing a patient easily navigating Sehat Saathi will appear here. In the meantime, explore the interactive 'Show Me How' step guide above."}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab("guide")}
                      className="rounded-xl bg-clinic-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-clinic-700 transition"
                    >
                      {language === "hi" ? "चरण-दर-चरण मार्गदर्शिका देखें" : "Explore Step-by-Step Guide"} →
                    </button>

                    <button
                      type="button"
                      onClick={() => nav("/patient/entry")}
                      className="rounded-xl border border-clinic-200 bg-white px-5 py-2.5 text-xs font-semibold text-ink shadow-2xs hover:bg-clinic-50 transition"
                    >
                      {language === "hi" ? "सीधे शुरू करें" : "Start Intake Now"}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · Sahayak Patient Support
      </footer>
    </div>
  );
}
