import { Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { usePatientSession } from '../features/patient/state/PatientSessionContext';
import { useLanguage } from '../i18n/LanguageContext';

export default function PatientComplete() {
  const s = usePatientSession();
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-3xl border border-clinic-100 bg-white/95 p-10 text-center shadow-sm glass-card">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-clinic-50 text-clinic-700 text-4xl shadow-inner border border-clinic-100">
              ✓
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-wider text-clinic-600">
              {language === 'hi' ? 'सत्र सफलतापूर्वक दर्ज' : 'Intake Complete'}
            </p>

            <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
              {language === 'hi' ? 'आपकी जानकारी दर्ज कर ली गई है' : 'Your clinical history is recorded.'}
            </h1>

            <p className="mt-3 text-base text-muted">
              {language === 'hi'
                ? 'आपका इतिहास चिकित्सक समीक्षा और परामर्श के लिए तैयार है।'
                : 'Your structured intake is ready in the physician portal for pre-consultation review.'}
            </p>

            {s.patientProfile && (
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-clinic-200 bg-clinic-50/80 px-4 py-1.5 text-xs font-mono text-clinic-800">
                <span>Session ID:</span>
                <span className="font-bold">{s.patientProfile.identifier}</span>
              </div>
            )}

            <div className="mt-8 rounded-2xl border border-clinic-100 bg-clinic-50/60 p-6 text-left">
              <div className="flex items-center gap-2">
                <span className="text-base">📋</span>
                <p className="font-semibold text-clinic-900 text-sm">
                  {language === 'hi' ? 'आगे क्या होगा?' : 'What happens next?'}
                </p>
              </div>
              <p className="mt-2 text-xs text-clinic-800 leading-relaxed">
                {language === 'hi'
                  ? 'चिकित्सक आपके संरचित इतिहास, मूल उत्तरों, पिछले रिकॉर्ड्स, समयरेखा और सुरक्षा अलर्ट्स की समीक्षा करके परामर्श शुरू करेंगे।'
                  : 'Your doctor will inspect the structured timeline, review safety alerts, verify document entities, and proceed with your clinical evaluation.'}
              </p>
            </div>

            <div className="mt-10 border-t border-clinic-100 pt-6">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-full bg-clinic-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-clinic-700 transition"
              >
                {language === 'hi' ? 'समाप्त करें और मुख्य पृष्ठ पर जाएं' : 'Done · Return to Home'} →
              </Link>
            </div>
          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · Intake Recorded
      </footer>
    </div>
  );
}
