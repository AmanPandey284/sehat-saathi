import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientSession } from '../features/patient/state/PatientSessionContext';

export default function EmergencyScreen() {
  const { language } = useLanguage();
  const { safetyFlags, resetSession } = usePatientSession();
  const navigate = useNavigate();

  const handleReturnToStart = () => {
    resetSession();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between">
      <div>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-6 py-10">
          {/* HIGH-VISIBILITY CLINICAL TRIAGE CARD */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-red-500 bg-gradient-to-b from-red-950/90 to-slate-900 p-8 shadow-2xl sm:p-10">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-2xl shadow-lg shadow-red-600/40 animate-pulse" aria-hidden>
                🚨
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-red-400">
                  {language === 'hi' ? 'तत्काल ट्रायेज अलर्ट' : 'Immediate Clinical Triage Alert'}
                </p>
                <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {language === 'hi' ? 'तुरंत ट्रायेज की सलाह' : 'Immediate Triage Recommended'}
                </h1>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-red-500/40 bg-red-900/30 p-4 text-red-200 leading-relaxed text-sm">
              <p className="font-semibold text-white">
                {language === 'hi' ? 'नियमित इतिहास रोक दिया गया है' : 'Routine History Collection Suspended'}
              </p>
              <p className="mt-1">
                {language === 'hi'
                  ? 'आपके बताए लक्षणों के आधार पर प्राथमिकता स्तर 1 (रेड-फ्लैग) दर्ज किया गया है। कृपया यह स्क्रीन तुरंत अस्पताल के ट्रायेज या आपातकालीन स्टाफ को दिखाएं।'
                  : 'A potentially acute emergency symptom was reported. Please keep this screen open and show it immediately to the triage nurse or attending physician.'}
              </p>
            </div>

            {/* TRIGGERED RED FLAGS */}
            <div className="mt-6 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-red-300">
                {language === 'hi' ? 'पहचाने गए आपातकालीन लक्षण' : 'Triggered Clinical Red Flags'}
              </p>
              {safetyFlags.map((f) => (
                <div key={f.id} className="rounded-2xl border border-red-500/30 bg-slate-950/80 p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-red-500" />
                    <p className="font-semibold text-red-200 text-sm">{f.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-300 pl-4">{f.explanation}</p>
                </div>
              ))}
            </div>

            {/* EMERGENCY CONTACT CALLOUT */}
            <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-950/60 p-4 text-sm text-red-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">📞</span>
                <p className="font-bold text-white">
                  {language === 'hi' ? 'आपातकालीन सहायता (भारत)' : 'Emergency Assistance (India)'}
                </p>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                {language === 'hi'
                  ? 'यदि आप अस्पताल परिसर में नहीं हैं, तो तुरंत एम्बुलेंस के लिए 108 पर कॉल करें या नजदीकी आकस्मिक कक्ष (Emergency Room) जाएं।'
                  : 'If you are not currently in a hospital setting, dial 108 for ambulance services or proceed to the nearest emergency department immediately.'}
              </p>
            </div>

            {/* EXPLICIT ACTIONS */}
            <div className="mt-8 flex flex-col items-start gap-4 border-t border-red-500/30 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-400 animate-ping" />
                <span>{language === 'hi' ? 'ट्रायेज स्क्रीन सक्रिय रहेगी' : 'Screen remains visible for staff review'}</span>
              </div>
              <button
                type="button"
                onClick={handleReturnToStart}
                className="rounded-full border border-red-500/60 bg-red-900/30 px-6 py-2.5 text-xs font-semibold text-red-200 hover:bg-red-800/40 transition"
              >
                {language === 'hi' ? 'सत्र समाप्त कर मुख्य पृष्ठ पर जाएं' : 'Return to Start (Reset Session)'}
              </button>
            </div>
          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-slate-500">
        Sehat Saathi · SIH26047 · Emergency Safety Protocol · Deterministic Rule Engine
      </footer>
    </div>
  );
}
