import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientSession } from '../features/patient/state/PatientSessionContext';

export default function ExistingPatientPlaceholder() {
  const nav = useNavigate();
  const { language } = useLanguage();
  const { resetSession } = usePatientSession();

  const handleStartAsNew = () => {
    resetSession();
    try {
      sessionStorage.removeItem("sehatSaathi_adaptive_analysis");
    } catch {}
    nav('/patient/consent');
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader showStatus={false} />
        <main className="mx-auto max-w-2xl px-6 pb-20 pt-12">
          <div className="rounded-3xl border border-clinic-100 bg-white/90 p-8 shadow-sm sm:p-12 glass-card text-center">
            
            {/* Badge & Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl border border-amber-200/60 shadow-xs">
              ⏳
            </div>

            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/80 px-3.5 py-1 text-xs font-semibold text-amber-800">
              <span>{language === 'hi' ? 'आगामी चरण' : 'Coming in Next Phase'}</span>
            </div>

            <h1 className="mt-4 font-display text-2xl font-semibold text-ink sm:text-3xl">
              {language === 'hi' ? 'पुराने मरीज का डेटा पुनर्प्राप्ति' : 'Returning Patient Lookup'}
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-muted max-w-lg mx-auto">
              {language === 'hi'
                ? 'पुराने मरीज की जानकारी (ABHA ID या फोन नंबर द्वारा) प्राप्त करने की सुविधा अगले चरण में सक्रिय की जाएगी। वर्तमान में आप नए मरीज के रूप में परामर्श शुरू कर सकते हैं।'
                : 'Returning-patient retrieval is coming in the next phase. You will be able to retrieve your past consultation records using your ABHA ID or phone number without re-entering your details.'}
            </p>

            <div className="mt-8 rounded-2xl border border-clinic-100 bg-clinic-50/50 p-4 text-left text-xs text-muted space-y-2">
              <div className="flex items-center gap-2 font-medium text-clinic-900">
                <span>💡</span>
                <span>{language === 'hi' ? 'आप क्या कर सकते हैं?' : 'What would you like to do?'}</span>
              </div>
              <p>
                {language === 'hi'
                  ? '• नए मरीज के रूप में आगे बढ़ें और आज का परामर्श पूरा करें।'
                  : '• Start as a new patient to complete your pre-consultation intake today.'}
              </p>
              <p>
                {language === 'hi'
                  ? '• या प्रवेश चयन स्क्रीन पर वापस जाएं।'
                  : '• Or return to the patient selection screen.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              <button
                type="button"
                onClick={handleStartAsNew}
                className="rounded-full bg-clinic-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-clinic-700 transition"
              >
                {language === 'hi' ? 'नए मरीज के रूप में शुरू करें' : 'Start as New Patient'} →
              </button>

              <button
                type="button"
                onClick={() => nav('/patient/entry')}
                className="rounded-full border border-clinic-200 px-6 py-3 text-sm font-medium text-clinic-700 hover:bg-clinic-50 transition"
              >
                ← {language === 'hi' ? 'वापस चयन पर जाएं' : 'Back to Selection'}
              </button>
            </div>

          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · Patient Consultation Portal
      </footer>
    </div>
  );
}
