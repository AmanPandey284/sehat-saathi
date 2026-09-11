import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientSession } from '../features/patient/state/PatientSessionContext';

export default function PatientProfile() {
  const nav = useNavigate();
  const { language } = useLanguage();
  const { setPatientProfile, consentGranted } = usePatientSession();

  useEffect(() => {
    if (!consentGranted) nav('/patient/consent', { replace: true });
  }, [consentGranted, nav]);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [error, setError] = useState('');

  const go = () => {
    if (!name.trim() || !age.trim()) {
      setError(language === 'hi' ? 'नाम और उम्र दर्ज करें।' : 'Please enter name and age.');
      return;
    }
    setPatientProfile({
      name: name.trim(),
      age: age.trim(),
      sex,
      identifier: `DEMO-${Date.now()}`,
      identifierType: 'demo',
      language
    });
    nav('/patient');
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-6 py-10">
          <div className="rounded-3xl border border-clinic-100 bg-white/90 p-8 shadow-sm sm:p-10 glass-card">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-clinic-600">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-clinic-100 text-clinic-700 text-[11px]">
                1
              </span>
              <span>{language === 'hi' ? 'चरण 1 · बुनियादी जानकारी' : 'Step 1 of 5 · Patient Details'}</span>
            </div>

            <h1 className="mt-3 font-display text-2xl font-semibold text-ink sm:text-3xl">
              {language === 'hi' ? 'अपनी जानकारी दर्ज करें' : 'Tell us a little about yourself'}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {language === 'hi'
                ? 'यह जानकारी डॉक्टर के पर्चे और सारांश के लिए आवश्यक है।'
                : 'Used only to associate your intake history with your clinical visit.'}
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted">
                  {language === 'hi' ? 'पूरा नाम' : 'Full Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  placeholder={language === 'hi' ? 'जैसे: रमेश कुमार' : 'e.g. Ramesh Kumar'}
                  className="mt-1 w-full rounded-xl border border-clinic-200 px-4 py-3 text-ink focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-100 transition"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted">
                    {language === 'hi' ? 'उम्र (वर्ष)' : 'Age (years)'}
                  </label>
                  <input
                    inputMode="numeric"
                    type="number"
                    value={age}
                    onChange={(e) => { setAge(e.target.value); setError(''); }}
                    placeholder="e.g. 42"
                    className="mt-1 w-full rounded-xl border border-clinic-200 px-4 py-3 text-ink focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-100 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted">
                    {language === 'hi' ? 'लिंग' : 'Gender'}
                  </label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-clinic-200 px-4 py-3 text-ink focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-100 transition"
                  >
                    <option value="">{language === 'hi' ? 'बताना नहीं चाहते' : 'Prefer not to say'}</option>
                    <option value="Female">{language === 'hi' ? 'महिला' : 'Female'}</option>
                    <option value="Male">{language === 'hi' ? 'पुरुष' : 'Male'}</option>
                    <option value="Other">{language === 'hi' ? 'अन्य' : 'Other'}</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </p>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-clinic-100 pt-6">
              <button
                type="button"
                onClick={() => nav('/patient/consent')}
                className="rounded-full border border-clinic-200 px-6 py-3 text-sm font-medium text-muted hover:bg-clinic-50 transition"
              >
                {language === 'hi' ? 'वापस' : 'Back'}
              </button>
              <button
                type="button"
                onClick={go}
                className="rounded-full bg-clinic-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-clinic-700 transition"
              >
                {language === 'hi' ? 'आगे बढ़ें' : 'Continue to Complaint'} →
              </button>
            </div>
          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · Demographics Intake
      </footer>
    </div>
  );
}
