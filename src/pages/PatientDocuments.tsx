import { Link, useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import DocumentUpload from '../features/documents/DocumentUpload';
import { usePatientSession, type BackgroundHistory } from '../features/patient/state/PatientSessionContext';
import { buildTimeline } from '../features/history/recordUtils';
import { useLanguage } from '../i18n/LanguageContext';
import { useState } from 'react';

const bgItems = [
  ['pastMedical', 'Past medical history'],
  ['pastSurgical', 'Past surgical history'],
  ['medications', 'Current medicines / prescriptions'],
  ['allergies', 'Known allergies'],
  ['family', 'Family history'],
  ['personal', 'Personal & lifestyle history'],
  ['reviewOfSystems', 'Other symptoms & systemic review']
] as const;

export default function PatientDocuments() {
  const { language } = useLanguage();
  const {
    chiefComplaint,
    historyAnswers,
    safetyFlags,
    backgroundHistory,
    setBackgroundHistory,
    setTimeline,
    documents
  } = usePatientSession();
  const nav = useNavigate();
  const [saved, setSaved] = useState(false);

  const set = (k: keyof BackgroundHistory, v: string) =>
    setBackgroundHistory({ ...backgroundHistory, [k]: v });

  const review = () => {
    setTimeline(buildTimeline(chiefComplaint, historyAnswers, documents, backgroundHistory));
    setSaved(true);
    setTimeout(() => nav('/patient/review'), 100);
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader />
        <main className="mx-auto max-w-4xl px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-clinic-600">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-clinic-100 text-clinic-700 text-[11px]">
                  4
                </span>
                <span>{language === 'hi' ? 'चरण 4 · मेडिकल रिकॉर्ड्स' : 'Step 4 of 5 · Medical Records & History'}</span>
              </div>
              <h1 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
                {language === 'hi' ? 'पिछली जानकारी व पर्चे जोड़ें' : 'Past Medical Records & OCR'}
              </h1>
            </div>
            {safetyFlags.length > 0 && (
              <span className="rounded-full bg-red-100 px-3.5 py-1.5 text-xs font-bold text-red-800 border border-red-200">
                🚨 Priority Triage Active
              </span>
            )}
          </div>

          {/* BACKGROUND HISTORY */}
          <section className="mt-6 rounded-3xl border border-clinic-100 bg-white/95 p-7 shadow-sm glass-card">
            <h2 className="font-display text-xl font-semibold text-ink">
              {language === 'hi' ? 'पिछला चिकित्सा इतिहास' : 'Background Medical History'}
            </h2>
            <p className="mt-1 text-xs text-muted">
              Add any chronic conditions, regular prescriptions, or past surgeries.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {bgItems.map(([key, label]) => (
                <label key={key} className="block text-xs font-bold uppercase tracking-wider text-muted">
                  {label}
                  <textarea
                    rows={2}
                    value={backgroundHistory[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-clinic-200 p-3 text-sm font-normal text-ink focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-100 transition"
                    placeholder="Not reported"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* DOCUMENT UPLOAD */}
          <div className="mt-6">
            <DocumentUpload />
          </div>

          {/* EXTRACTED OCR SUMMARY CARD */}
          {documents.length > 0 && (
            <section className="mt-6 rounded-3xl border border-clinic-100 bg-white/95 p-7 shadow-sm glass-card">
              <p className="text-xs font-bold uppercase tracking-wider text-clinic-600">
                Document Intelligence Pipeline
              </p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-4">
                {['📄 Scanned Report', '↓ Text & Entity Extraction', '✓ Clinical Normalization', '📋 Physician Summary'].map((x) => (
                  <div key={x} className="rounded-xl border border-clinic-100 bg-clinic-50/70 p-3 text-center text-xs font-semibold text-clinic-900">
                    {x}
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {documents.flatMap((d) =>
                  d.entities.slice(0, 8).map((e, i) => (
                    <div key={`${d.id}-${i}`} className="rounded-xl border border-clinic-100 bg-canvas p-3">
                      <p className="font-semibold text-ink text-xs">{e.type}: <span className="font-normal">{e.value}</span></p>
                      <p className="mt-1 text-[11px] text-muted">Source: {d.name} · {e.confidence}{e.page ? ` · page ${e.page}` : ''}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* ACTIONS */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-clinic-100 pt-6">
            <Link
              to="/patient/history"
              className="rounded-full border border-clinic-200 px-6 py-3 text-sm font-medium text-muted hover:bg-clinic-50 transition"
            >
              ← {language === 'hi' ? 'इतिहास पर वापस' : 'Back to History'}
            </Link>

            <div className="flex items-center gap-3">
              <Link
                to="/patient/ayush"
                className="rounded-full border border-clinic-200 px-5 py-3 text-sm font-medium text-clinic-700 hover:bg-clinic-50 transition"
              >
                🌿 AYUSH History
              </Link>
              <button
                onClick={review}
                className="rounded-full bg-clinic-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-clinic-700 transition"
              >
                {saved ? 'Opening review…' : 'Review & Confirm →'}
              </button>
            </div>
          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · Records & Document OCR
      </footer>
    </div>
  );
}
