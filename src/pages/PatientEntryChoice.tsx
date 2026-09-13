import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientSession } from '../features/patient/state/PatientSessionContext';

export default function PatientEntryChoice() {
  const nav = useNavigate();
  const { language } = useLanguage();
  const { resetSession } = usePatientSession();

  const handleStartNewPatient = () => {
    resetSession();
    try {
      sessionStorage.removeItem("sehatSaathi_adaptive_analysis");
    } catch {}
    nav('/patient/consent');
  };

  const handleExistingPatient = () => {
    nav('/patient/lookup');
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader showStatus={false} />
        <main className="mx-auto max-w-4xl px-6 pb-20 pt-8">
          <div className="rounded-3xl border border-clinic-100 bg-white/90 p-8 shadow-sm sm:p-12 glass-card">
            
            {/* Header / Intro */}
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-clinic-200 bg-clinic-50 px-3.5 py-1 text-xs font-semibold text-clinic-700">
                <span>🏥</span>
                <span>{language === 'hi' ? 'रोगी परामर्श प्रवेश' : 'Patient Consultation Entry'}</span>
              </span>
              <h1 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl">
                {language === 'hi' ? 'सेहत साथी में आपका स्वागत है' : 'Welcome to Sehat Saathi'}
              </h1>
              <p className="mt-2 text-base text-muted max-w-xl mx-auto">
                {language === 'hi'
                  ? 'आइए आपको आपके परामर्श के लिए तैयार करें।'
                  : "Let's get you ready for your consultation."}
              </p>
            </div>

            {/* Two Clearly Separated Entry Options */}
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              
              {/* Option 1: New Patient */}
              <div className="relative group flex flex-col justify-between rounded-2xl border-2 border-clinic-500/20 bg-gradient-to-br from-white to-clinic-50/50 p-7 shadow-sm transition-all duration-200 hover:border-clinic-500 hover:shadow-md">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-clinic-600 text-2xl text-white shadow-xs">
                      🌱
                    </span>
                    <span className="rounded-full bg-clinic-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-clinic-700">
                      {language === 'hi' ? 'नया मरीज' : 'New Patient'}
                    </span>
                  </div>

                  <h2 className="mt-5 font-display text-xl font-semibold text-ink">
                    {language === 'hi' ? 'मैं पहली बार आ रहा हूँ' : "I'm visiting for the first time"}
                  </h2>
                  <p className="mt-2 text-sm text-muted leading-relaxed">
                    {language === 'hi'
                      ? 'अपना स्वास्थ्य प्रोफ़ाइल बनाएं और निर्देशित इतिहास पूरा करें।'
                      : 'Create your health profile and complete a guided history.'}
                  </p>
                </div>

                <div className="mt-8">
                  <button
                    type="button"
                    onClick={handleStartNewPatient}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-clinic-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-clinic-700 hover:shadow"
                  >
                    <span>{language === 'hi' ? 'नए मरीज के रूप में शुरू करें' : 'Start as New Patient'}</span>
                    <span aria-hidden>→</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Existing Patient */}
              <div className="relative group flex flex-col justify-between rounded-2xl border border-clinic-200 bg-white p-7 shadow-sm transition-all duration-200 hover:border-clinic-400 hover:shadow-md">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl border border-clinic-100">
                      🔄
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      {language === 'hi' ? 'पुराना मरीज' : 'Existing Patient'}
                    </span>
                  </div>

                  <h2 className="mt-5 font-display text-xl font-semibold text-ink">
                    {language === 'hi' ? 'मैं पहले आ चुका हूँ' : "I've visited before"}
                  </h2>
                  <p className="mt-2 text-sm text-muted leading-relaxed">
                    {language === 'hi'
                      ? 'सब कुछ दोबारा दर्ज किए बिना अपनी पिछली जानकारी से जारी रखें।'
                      : 'Continue from your previous information without entering everything again.'}
                  </p>
                </div>

                <div className="mt-8">
                  <button
                    type="button"
                    onClick={handleExistingPatient}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-clinic-200 bg-clinic-50 px-6 py-3.5 text-base font-semibold text-clinic-800 shadow-xs transition hover:bg-clinic-100 hover:border-clinic-300"
                  >
                    <span>{language === 'hi' ? 'पुराने मरीज के रूप में जारी रखें' : 'Continue as Existing Patient'}</span>
                    <span aria-hidden>→</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Back Navigation */}
            <div className="mt-8 pt-6 border-t border-clinic-100 text-center">
              <button
                type="button"
                onClick={() => nav('/')}
                className="text-sm font-medium text-muted hover:text-ink transition inline-flex items-center gap-1.5"
              >
                <span>←</span>
                <span>{language === 'hi' ? 'मुख्य पृष्ठ पर वापस जाएं' : 'Back to Home'}</span>
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
