import { useNavigate, Link } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { useLanguage } from "../i18n/LanguageContext";
import { usePatientSession } from "../features/patient/state/PatientSessionContext";

export default function PatientEntryChoice() {
  const nav = useNavigate();
  const { language } = useLanguage();
  const { resetSession } = usePatientSession();

  const handleStartGeneral = () => {
    resetSession();
    try {
      sessionStorage.removeItem("sehatSaathi_adaptive_analysis");
    } catch {}
    nav("/patient/consent");
  };

  const handleStartAyush = () => {
    resetSession();
    try {
      sessionStorage.removeItem("sehatSaathi_adaptive_analysis");
    } catch {}
    nav("/patient/ayush");
  };

  const handleExistingPatient = () => {
    nav("/patient/lookup");
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader showStatus={false} />

        <main className="mx-auto max-w-4xl px-6 pb-16 pt-8">
          <div className="rounded-3xl border border-clinic-100 bg-white/95 p-8 shadow-sm sm:p-12 glass-card">
            
            {/* Header / Intro */}
            <div className="text-center max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-2 rounded-full border border-clinic-200 bg-clinic-50 px-3.5 py-1 text-xs font-semibold text-clinic-800">
                <span className="h-1.5 w-1.5 rounded-full bg-clinic-600" aria-hidden="true" />
                <span>{language === "hi" ? "परामर्श प्रकार चुनें" : "Select Consultation Mode"}</span>
              </span>

              <h1 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl tracking-tight">
                {language === "hi" ? "आप किस प्रकार का परामर्श चाहते हैं?" : "Choose your consultation path"}
              </h1>

              <p className="mt-2 text-base text-muted leading-relaxed">
                {language === "hi"
                  ? "मानक ओपीडी परामर्श या विस्तृत आयुष (आयुर्वेदिक) इतिहास में से चुनें।"
                  : "Select standard clinical intake or comprehensive AYUSH (Ayurvedic) history."}
              </p>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted">
                <span>{language === "hi" ? "सहायता चाहिए?" : "Need help?"}</span>
                <Link
                  to="/patient/help"
                  className="font-medium text-clinic-700 hover:text-clinic-900 underline underline-offset-2 transition"
                >
                  {language === "hi" ? "उपयोग मार्गदर्शिका देखें" : "View walkthrough"}
                </Link>
              </div>
            </div>

            {/* Two Balanced Choices */}
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              
              {/* Option 1: General Consultation */}
              <div className="relative flex flex-col justify-between rounded-2xl border-2 border-clinic-600/30 bg-gradient-to-b from-white to-clinic-50/40 p-7 shadow-xs transition duration-200 hover:border-clinic-600/60 hover:shadow-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-clinic-100 px-3 py-1 text-xs font-semibold text-clinic-800">
                      <span>{language === "hi" ? "सामान्य परामर्श" : "General Consultation"}</span>
                    </span>
                    <span className="text-xs text-muted">
                      {language === "hi" ? "मानक ओपीडी" : "Standard OPD"}
                    </span>
                  </div>

                  <h2 className="mt-4 font-display text-xl font-semibold text-ink sm:text-2xl">
                    {language === "hi" ? "एलोपैथिक / सामान्य ओपीडी" : "General OPD Consultation"}
                  </h2>
                  
                  <p className="mt-2 text-sm text-muted leading-relaxed">
                    {language === "hi"
                      ? "लक्षण-विशिष्ट अनुकूली क्लीनिकल प्रश्न, पिछले पर्चे व जांच रिपोर्ट, और त्वरित रेड-फ्लैग सुरक्षा जांच।"
                      : "Adaptive symptom branching across 9 organ systems, document OCR extraction, and immediate triage flag screening."}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-clinic-100/70">
                  <button
                    type="button"
                    onClick={handleStartGeneral}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-clinic-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-clinic-700 hover:shadow"
                  >
                    <span>{language === "hi" ? "सामान्य परामर्श शुरू करें" : "Start General Intake"}</span>
                    <span aria-hidden="true">→</span>
                  </button>

                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={handleExistingPatient}
                      className="text-xs font-medium text-clinic-700 hover:text-clinic-900 transition inline-flex items-center gap-1 py-1"
                    >
                      <span>{language === "hi" ? "पहले आ चुके हैं? पिछला रिकॉर्ड खोजें" : "Visiting again? Find existing record"}</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Option 2: AYUSH Consultation */}
              <div className="relative flex flex-col justify-between rounded-2xl border border-clinic-200 bg-white p-7 shadow-xs transition duration-200 hover:border-clinic-400 hover:shadow-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
                      <span>{language === "hi" ? "आयुष परामर्श" : "AYUSH Consultation"}</span>
                    </span>
                    <span className="text-xs text-muted">
                      {language === "hi" ? "आयुर्वेदिक इतिहास" : "Ayurvedic History"}
                    </span>
                  </div>

                  <h2 className="mt-4 font-display text-xl font-semibold text-ink sm:text-2xl">
                    {language === "hi" ? "आयुष नैदानिक इतिहास" : "AYUSH Clinical History"}
                  </h2>
                  
                  <p className="mt-2 text-sm text-muted leading-relaxed">
                    {language === "hi"
                      ? "प्रकृति (वात, पित्त, कफ), धातु सार, आहार-शक्ति, अग्नि और कोष्ठ का संरचित आयुर्वेदिक मूल्यांकन।"
                      : "Standardized questionnaire capturing Prakriti (Vata/Pitta/Kapha), Sara, Agni, and lifestyle factors."}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-clinic-100">
                  <button
                    type="button"
                    onClick={handleStartAyush}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-clinic-300 bg-clinic-50 px-6 py-3.5 text-base font-semibold text-clinic-800 transition hover:bg-clinic-100 hover:border-clinic-400"
                  >
                    <span>{language === "hi" ? "आयुष इतिहास शुरू करें" : "Start AYUSH Intake"}</span>
                    <span aria-hidden="true">→</span>
                  </button>

                  <div className="mt-3 text-center">
                    <span className="text-[11px] text-muted inline-block py-1">
                      {language === "hi"
                        ? "रोगी-सूचित इतिहास · चिकित्सक संदर्भ हेतु · कोई स्वचालित निदान नहीं"
                        : "Patient-reported history · For practitioner reference · Not an automated diagnosis"}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Back Navigation */}
            <div className="mt-8 pt-6 border-t border-clinic-100 text-center">
              <button
                type="button"
                onClick={() => nav("/")}
                className="text-sm font-medium text-muted hover:text-ink transition inline-flex items-center gap-1.5"
              >
                <span aria-hidden="true">←</span>
                <span>{language === "hi" ? "मुख्य पृष्ठ पर वापस जाएं" : "Back to Home"}</span>
              </button>
            </div>

          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · Patient Intake & Triage Portal
      </footer>
    </div>
  );
}
