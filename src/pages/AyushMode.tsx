import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { usePatientSession } from '../features/patient/state/PatientSessionContext';

const items = [
  ['Prakriti', 'Constitution / baseline physiological nature'],
  ['Vikriti', 'Current physiological imbalance / acute symptoms'],
  ['Sara', 'Dhatu tissue excellence / constitutional quality'],
  ['Samhanana', 'Compactness and body build symmetry'],
  ['Pramana', 'Body proportions and anthropometric measurements'],
  ['Satmya', 'Habituation and climate / diet suitability'],
  ['Sattva', 'Mental disposition, resilience, and temperament'],
  ['Ahara Shakti', 'Digestive capacity (Abhyavaharana & Jarana Shakti)'],
  ['Vyayama Shakti', 'Physical endurance and exercise tolerance'],
  ['Vaya', 'Chronological age and developmental life stage'],
  ['Ahara-Vihara', 'Daily regimen (Dinacharya) & seasonal diet (Ritucharya)']
];

export default function AyushMode() {
  const { ayushHistory, setAyushHistory } = usePatientSession();
  const [saved, setSaved] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(ayushHistory);

  const save = () => {
    setAyushHistory(values);
    setSaved(true);
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader />
        <main className="mx-auto max-w-3xl px-6 py-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-clinic-600">
            <span className="text-base">🌿</span>
            <span>AYUSH Clinical Module · Ayurvedic Intake</span>
          </div>

          <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
            Extended Ayurvedic Intake
          </h1>
          <p className="mt-2 text-sm text-muted">
            Structured patient-reported capture for Ayurvedic OPDs (Dasavidha Pariksha aligned). Does not generate an automated diagnosis; provided for practitioner reference.
          </p>

          <div className="mt-6 space-y-4">
            {items.map(([key, help]) => (
              <div key={key} className="rounded-2xl border border-clinic-100 bg-white/90 p-5 shadow-xs glass-card">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-semibold text-ink text-sm">{key}</span>
                  <span className="text-xs text-muted">{help}</span>
                </div>
                <textarea
                  rows={2}
                  value={values[key] ?? ''}
                  onChange={(e) => { setValues({ ...values, [key]: e.target.value }); setSaved(false); }}
                  className="mt-2.5 w-full rounded-xl border border-clinic-200 p-3 text-sm text-ink focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-100 transition"
                  placeholder="Patient-reported observations or symptoms…"
                />
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-clinic-100 pt-6">
            <Link
              to="/patient/documents"
              className="rounded-full border border-clinic-200 px-6 py-3 text-sm font-medium text-muted hover:bg-clinic-50 transition"
            >
              ← Back to Documents
            </Link>
            <button
              onClick={save}
              className={`rounded-full px-8 py-3.5 text-base font-semibold text-white shadow-sm transition ${
                saved ? 'bg-clinic-800' : 'bg-clinic-600 hover:bg-clinic-700'
              }`}
            >
              {saved ? '✓ AYUSH History Saved' : 'Save AYUSH History'}
            </button>
          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · Ayurvedic Intake Module
      </footer>
    </div>
  );
}
