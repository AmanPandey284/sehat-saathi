import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/AppHeader';
import { useLanguage } from '../../i18n/LanguageContext';
import { usePatientSession } from './state/PatientSessionContext';

export default function ConsentScreen() {
  const { t, language } = useLanguage();
  const nav = useNavigate();
  const { setConsentGranted } = usePatientSession();

  const agree = () => {
    setConsentGranted(true);
    nav('/patient/profile');
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-6 pb-20 pt-8">
          <div className="rounded-3xl border border-clinic-100 bg-white/90 p-8 shadow-sm sm:p-10 glass-card">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-clinic-50 text-xl" aria-hidden>
                📋
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-clinic-600">
                  {language === 'hi' ? 'सहमति व गोपनीयता' : 'Consent & Privacy'}
                </p>
                <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                  {t.consent.title}
                </h1>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted">
              {t.consent.intro}
            </p>

            <ul className="mt-6 space-y-3.5 rounded-2xl border border-clinic-100 bg-clinic-50/40 p-5">
              {t.consent.points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-ink leading-relaxed">
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-clinic-600 text-[10px] text-white">
                    ✓
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-clinic-100 pt-6">
              <button
                type="button"
                onClick={() => nav('/')}
                className="rounded-full border border-clinic-200 px-6 py-3 text-sm font-medium text-muted hover:bg-clinic-50 transition"
              >
                {t.consent.cancel}
              </button>
              <button
                type="button"
                onClick={agree}
                className="rounded-full bg-clinic-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-clinic-700 transition"
              >
                {t.consent.agree} →
              </button>
            </div>
          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · Patient Pre-Consultation Consent
      </footer>
    </div>
  );
}
