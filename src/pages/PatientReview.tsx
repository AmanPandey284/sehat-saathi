import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientSession } from '../features/patient/state/PatientSessionContext';
import { buildTimeline, labelField, valueText } from '../features/history/recordUtils';
import { savePatientRecord, type StoredPatientRecord } from '../features/doctor/patientRecords';

const backgroundLabels: Record<string, string> = {
  pastMedical: 'Past Medical History',
  pastSurgical: 'Past Surgical History',
  medications: 'Current Medicines / Prescriptions',
  allergies: 'Allergies & Reactions',
  family: 'Family Medical History',
  personal: 'Lifestyle & Habits',
  reviewOfSystems: 'Other Systemic Symptoms'
};

export default function PatientReview() {
  const { language } = useLanguage();
  const nav = useNavigate();
  const s = usePatientSession();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const answers = s.historyAnswers ?? {};
  const all = useMemo(() => Object.entries(answers), [answers]);

  const updateBg = (key: string, value: string) =>
    s.setBackgroundHistory({ ...s.backgroundHistory, [key as keyof typeof s.backgroundHistory]: value });

  const confirm = () => {
    if (s.patientProfile && s.chiefComplaint) {
      const generatedTimeline = buildTimeline(
        s.chiefComplaint,
        answers,
        s.documents,
        s.backgroundHistory
      );
      const record: StoredPatientRecord = {
        id: s.patientProfile.identifier || `REC-${Date.now()}`,
        submittedAt: new Date().toISOString(),
        patientProfile: s.patientProfile,
        chiefComplaint: s.chiefComplaint,
        historyAnswers: answers,
        evidence: s.evidence,
        safetyFlags: s.safetyFlags,
        documents: s.documents,
        backgroundHistory: s.backgroundHistory,
        timeline: s.timeline.length > 0 ? s.timeline : generatedTimeline,
        doctorReviews: s.doctorReviews,
        ayushHistory: s.ayushHistory,
        reviewStatus: 'pending'
      };
      savePatientRecord(record);
    }
    nav('/patient/complete');
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader />
        <main className="mx-auto max-w-4xl px-6 py-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-clinic-600">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-clinic-100 text-clinic-700 text-[11px]">
              5
            </span>
            <span>{language === 'hi' ? 'चरण 5 · अंतिम समीक्षा व पुष्टि' : 'Step 5 of 5 · Review & Confirm'}</span>
          </div>

          <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
            {language === 'hi' ? 'अपनी जानकारी जांचें' : 'Review your clinical information'}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {language === 'hi'
              ? 'सबमिट करने से पहले आप कोई भी जानकारी जांच या बदल सकते हैं।'
              : 'Please check your recorded answers before submitting. You can edit any field if needed.'}
          </p>

          {/* PRIORITY REVIEW NOTICE */}
          {s.safetyFlags.length > 0 && (
            <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚨</span>
                <p className="font-bold text-red-900">
                  {language === 'hi' ? 'प्राथमिकता क्लिनिकल समीक्षा ध्वज' : 'Priority Clinical Triage Notice'}
                </p>
              </div>
              <div className="mt-3 space-y-2 pl-7">
                {s.safetyFlags.map((f) => (
                  <p key={f.id} className="text-sm text-red-800">
                    <strong>{f.title}:</strong> {f.explanation}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* STRUCTURED HISTORY CARD */}
          <section className="mt-6 rounded-3xl border border-clinic-100 bg-white/95 p-7 shadow-sm glass-card">
            <div className="flex items-center justify-between border-b border-clinic-50 pb-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink">
                  {language === 'hi' ? 'संरचित इतिहास' : 'Structured History'}
                </h2>
                <p className="text-xs text-muted">Chief Complaint: {s.chiefComplaint?.displayName || 'Reported'}</p>
              </div>
              <span className="rounded-full bg-clinic-50 px-3 py-1 text-xs font-semibold text-clinic-800">
                {all.length} recorded {all.length === 1 ? 'field' : 'fields'}
              </span>
            </div>

            <div className="mt-4 divide-y divide-clinic-50">
              {all.map(([field, value]) => (
                <div key={field} className="grid gap-3 py-4 sm:grid-cols-[1fr_1.4fr] sm:items-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">{labelField(field)}</p>
                    <p className="mt-0.5 text-xs text-clinic-700">Source: Patient</p>
                  </div>
                  <div>
                    <input
                      value={edits[field] ?? valueText(value)}
                      onChange={(e) => setEdits({ ...edits, [field]: e.target.value })}
                      className="w-full rounded-xl border border-clinic-200 p-3 text-sm text-ink focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-100 transition"
                    />
                    {edits[field] !== undefined && (
                      <button
                        onClick={() => {
                          const corrected = edits[field];
                          s.setHistoryAnswers({ ...answers, [field]: corrected });
                          const existing = s.evidence.find((e) => e.field === field);
                          const updated = {
                            field,
                            originalAnswer: existing?.originalAnswer ?? String(value ?? ''),
                            normalizedValue: corrected,
                            source: 'PATIENT' as const,
                            language: existing?.language ?? language,
                            timestamp: new Date().toISOString(),
                            confidence: existing?.confidence ?? ('medium' as const)
                          };
                          s.setEvidence([...s.evidence.filter((e) => e.field !== field), updated]);
                          setEdits({ ...edits });
                        }}
                        className="mt-2 rounded-full border border-clinic-300 bg-clinic-50 px-3 py-1 text-xs font-semibold text-clinic-800 hover:bg-clinic-100 transition"
                      >
                        Save correction
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* BACKGROUND HISTORY CARD */}
          <section className="mt-6 rounded-3xl border border-clinic-100 bg-white/95 p-7 shadow-sm glass-card">
            <h2 className="font-display text-xl font-semibold text-ink">
              {language === 'hi' ? 'पूर्व चिकित्सा इतिहास' : 'Background Medical History'}
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {Object.entries(backgroundLabels).map(([key, label]) => (
                <label key={key} className="block text-xs font-bold uppercase tracking-wider text-muted">
                  {label}
                  <textarea
                    rows={2}
                    value={s.backgroundHistory[key as keyof typeof s.backgroundHistory]}
                    onChange={(e) => updateBg(key, e.target.value)}
                    className="mt-1 w-full rounded-xl border border-clinic-200 p-3 text-sm font-normal text-ink focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-100 transition"
                    placeholder="Not reported"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* PREVIOUS DOCUMENTS */}
          {s.documents.length > 0 && (
            <section className="mt-6 rounded-3xl border border-clinic-100 bg-white/95 p-7 shadow-sm glass-card">
              <h2 className="font-display text-xl font-semibold text-ink">
                {language === 'hi' ? 'संलग्न चिकित्सा रिकॉर्ड्स' : 'Attached Medical Records'}
              </h2>
              <div className="mt-4 space-y-3">
                {s.documents.map((d) => (
                  <div key={d.id} className="rounded-2xl border border-clinic-100 bg-clinic-50/50 p-4">
                    <p className="font-semibold text-ink text-sm">{d.name}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {d.entities.slice(0, 10).map((e, i) => (
                        <span key={i} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-clinic-800 border border-clinic-100">
                          {e.type}: {e.value}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ACTIONS */}
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-clinic-100 pt-6">
            <Link
              to="/patient/documents"
              className="rounded-full border border-clinic-200 px-6 py-3 text-sm font-medium text-muted hover:bg-clinic-50 transition"
            >
              {language === 'hi' ? 'वापस' : 'Back to Documents'}
            </Link>
            <button
              onClick={confirm}
              className="rounded-full bg-clinic-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-clinic-700 transition"
            >
              {language === 'hi' ? 'पुष्टि करें और सबमिट करें' : 'Confirm & Submit Intake'} →
            </button>
          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · Clinical Verification & Submission
      </footer>
    </div>
  );
}
