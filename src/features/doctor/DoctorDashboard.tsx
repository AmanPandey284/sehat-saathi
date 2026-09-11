import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePatientSession } from '../patient/state/PatientSessionContext';
import { buildTimeline, labelField, valueText } from '../history/recordUtils';
import { buildFhirBundle } from '../history/fhir';
import { generateClinicalSummary } from '../history/summaryGenerator';
import { generateSummary } from '../../services/api';
import DocumentUpload from '../documents/DocumentUpload';
import { detectConflicts } from '../history/conflictEngine';
import { useDoctorAuth } from '../auth/DoctorAuthContext';
import {
  getStoredPatientRecords,
  updatePatientRecord,
  type StoredPatientRecord,
} from './patientRecords';

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export default function DoctorDashboard() {
  const s = usePatientSession();
  const { user, logout } = useDoctorAuth();
  const navigate = useNavigate();

  const [records, setRecords] = useState<StoredPatientRecord[]>(() =>
    getStoredPatientRecords()
  );

  // Selected patient record id from queue, or 'live' for current active session
  const [selectedRecordId, setSelectedRecordId] = useState<string>(() => {
    if (s.patientProfile?.identifier) {
      return s.patientProfile.identifier;
    }
    const stored = getStoredPatientRecords();
    return stored[0]?.id || 'live';
  });

  // Refresh records on mount and when selectedRecordId changes
  useEffect(() => {
    setRecords(getStoredPatientRecords());
  }, [selectedRecordId]);

  const activeRecord = useMemo(() => {
    return records.find(r => r.id === selectedRecordId) || null;
  }, [records, selectedRecordId]);

  const [tab, setTab] = useState<
    'summary' | 'conversation' | 'documents' | 'timeline'
  >('summary');

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState('');
  const [summaryProvider, setSummaryProvider] = useState('');
  const [busy, setBusy] = useState(false);

  // Resolved clinical data: selected record, or fallback to live session
  const answers = activeRecord ? activeRecord.historyAnswers : (s.historyAnswers ?? {});
  const complaint = activeRecord ? activeRecord.chiefComplaint : s.chiefComplaint;
  const backgroundHistory = activeRecord ? activeRecord.backgroundHistory : s.backgroundHistory;
  const documents = activeRecord ? activeRecord.documents : s.documents;
  const patientProfile = activeRecord ? activeRecord.patientProfile : s.patientProfile;
  const safetyFlags = activeRecord ? activeRecord.safetyFlags : s.safetyFlags;
  const doctorReviews = activeRecord ? activeRecord.doctorReviews : s.doctorReviews;
  const evidence = activeRecord ? activeRecord.evidence : s.evidence;
  const reviewStatus = activeRecord?.reviewStatus || 'pending';

  const conflicts = useMemo(
    () =>
      detectConflicts(
        backgroundHistory,
        documents
      ),
    [backgroundHistory, documents]
  );

  const timeline = useMemo(
    () =>
      activeRecord?.timeline && activeRecord.timeline.length > 0
        ? activeRecord.timeline
        : buildTimeline(
            complaint,
            answers,
            documents,
            backgroundHistory
          ),
    [activeRecord, complaint, answers, documents, backgroundHistory]
  );

  const effectiveSummary =
    summary ||
    generateClinicalSummary(
      complaint,
      answers,
      documents,
      backgroundHistory,
      patientProfile,
      safetyFlags,
      doctorReviews
    );

  const evidenceFor = (field: string) =>
    evidence.find(e => e.field === field);

  const makeAiSummary = async () => {
    setBusy(true);

    try {
      const r = await generateSummary({
        complaint,
        history: {
          ...answers,
          ...backgroundHistory
        },
        documents: documents,
        evidence: evidence
      });

      setSummary(r.summary);
      setSummaryProvider(r.provider);
    } catch {
      setSummary(
        generateClinicalSummary(
          complaint,
          answers,
          documents,
          backgroundHistory,
          patientProfile,
          safetyFlags,
          doctorReviews
        )
      );

      setSummaryProvider('local fallback');
    } finally {
      setBusy(false);
    }
  };

  const review = (
    field: string,
    status: 'confirmed' | 'edited' | 'rejected'
  ) => {
    const v =
      edits[field] ??
      String(answers[field] ?? '');

    const revItem = {
      field,
      status,
      editedValue: status === 'edited' ? v : undefined,
      reviewedAt: new Date().toISOString(),
      reviewer: user?.displayName || 'Dr. Sharma'
    };

    if (activeRecord) {
      const updatedReviews = [
        ...activeRecord.doctorReviews.filter(r => r.field !== field),
        revItem
      ];
      const updatedAnswers = status === 'edited'
        ? { ...activeRecord.historyAnswers, [field]: v }
        : activeRecord.historyAnswers;

      const updated = updatePatientRecord(activeRecord.id, {
        doctorReviews: updatedReviews,
        historyAnswers: updatedAnswers,
      });
      if (updated) {
        setRecords(getStoredPatientRecords());
      }
    } else {
      s.reviewField(revItem);
    }
  };

  const saveEdit = (field: string) => {
    review(field, 'edited');
  };

  const toggleRecordStatus = (newStatus: 'pending' | 'reviewed') => {
    if (activeRecord) {
      updatePatientRecord(activeRecord.id, { reviewStatus: newStatus });
      setRecords(getStoredPatientRecords());
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/doctor/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient">

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-clinic-100/80 glass-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-clinic-600 to-clinic-700 text-white shadow-sm shadow-clinic-600/20">
              <span className="text-xl">🩺</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-semibold text-ink">
                  Physician Review Portal
                </span>
                <span className="rounded-full border border-clinic-200 bg-clinic-50 px-2 py-0.5 text-[10px] font-bold text-clinic-700">
                  SIH26047 · DEMO
                </span>
              </div>
              <p className="text-xs text-muted">
                Pre-consultation clinical queue & triage validation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-ink">{user?.displayName || 'Dr. Sharma'}</p>
              <p className="text-[11px] text-muted">{user?.role || 'Senior Physician'} · <span className="font-mono text-[10px]">{user?.username || 'demo-doctor'}</span></p>
            </div>

            <Link
              to="/analytics"
              className="rounded-full border border-clinic-200 bg-white px-4 py-2 text-xs font-semibold text-muted hover:border-clinic-400 hover:text-ink transition shadow-2xs"
            >
              Analytics
            </Link>

            <button
              onClick={handleLogout}
              className="rounded-full border border-red-200 bg-red-50/60 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition shadow-2xs"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-6">

        {!complaint && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            No live patient session. The page below is safe demo scaffolding;
            use a completed patient flow for real testing.
          </div>
        )}

        {/* Safety Flags */}
        {safetyFlags.length > 0 && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-5">

            <p className="font-semibold text-red-900">
              Priority clinical review
            </p>

            {safetyFlags.map(f => (
              <p
                key={f.id}
                className="mt-1 text-sm text-red-800"
              >
                <strong>
                  {f.severity.toUpperCase()}:
                </strong>{' '}
                {f.title} — {f.explanation}
              </p>
            ))}

          </div>
        )}

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">

            <p className="font-semibold text-amber-900">
              Possible information conflicts
            </p>

            {conflicts.map(c => (
              <div
                key={c.id}
                className="mt-2 text-sm text-amber-900"
              >
                <strong>{c.field}:</strong>{' '}
                patient reported “{c.patient}”,
                document {c.source} contains “{c.document}”.
                {' '}
                {c.reason}
                {' '}
                Review before saving.
              </div>
            ))}

          </div>
        )}

        {/* PATIENT INTAKE QUEUE */}
        <div className="mb-6 rounded-2xl border border-clinic-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-ink">Patient Intake Queue</span>
              <span className="rounded-full bg-clinic-100 px-2.5 py-0.5 text-xs font-semibold text-clinic-800">
                {records.length} {records.length === 1 ? 'record' : 'records'}
              </span>
            </div>
            <p className="text-xs text-muted">
              Select a patient to inspect triage history, evidence, and review status.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {records.map((rec) => {
              const isSelected = rec.id === selectedRecordId;
              const hasUrgent = rec.safetyFlags.some((f) => f.severity === 'urgent');
              return (
                <button
                  key={rec.id}
                  onClick={() => {
                    setSelectedRecordId(rec.id);
                    setEdits({});
                    setSummary('');
                  }}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-clinic-600 bg-clinic-50/50 shadow-sm ring-1 ring-clinic-500'
                      : 'border-clinic-100 bg-white hover:border-clinic-200 hover:bg-clinic-50/30'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-1">
                    <span className="font-medium text-ink truncate text-sm">
                      {rec.patientProfile?.name || 'Anonymous'}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        rec.reviewStatus === 'reviewed'
                          ? 'bg-clinic-100 text-clinic-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {rec.reviewStatus}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-muted truncate w-full">
                    {rec.chiefComplaint?.displayName || 'Complaint not specified'}
                  </p>

                  <div className="mt-2 flex w-full items-center justify-between text-[11px] text-muted">
                    <span>{rec.patientProfile?.age ? `${rec.patientProfile.age}y` : ''} · {rec.patientProfile?.sex || '—'}</span>
                    {hasUrgent && (
                      <span className="font-bold text-red-600">🚨 Urgent</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">

          {/* Sidebar */}
          <aside className="h-fit rounded-2xl border border-clinic-100 bg-white p-5 shadow-sm">

            <div className="rounded-xl bg-clinic-50 p-4">

              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-muted">
                  Active Patient
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    reviewStatus === 'reviewed'
                      ? 'bg-clinic-200 text-clinic-900'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {reviewStatus}
                </span>
              </div>

              <p className="mt-1 font-semibold text-ink">
                {patientProfile?.name || 'Anonymous / Demo'}
              </p>

              <p className="text-sm text-muted">
                Age {patientProfile?.age || '—'} ·{' '}
                {patientProfile?.sex || '—'}
              </p>

              <p className="mt-1 text-xs text-muted">
                ID: {patientProfile?.identifier || activeRecord?.id || 'DEMO'}
              </p>

              {activeRecord && (
                <button
                  onClick={() =>
                    toggleRecordStatus(
                      reviewStatus === 'reviewed' ? 'pending' : 'reviewed'
                    )
                  }
                  className="mt-3 w-full rounded-lg border border-clinic-300 bg-white px-2 py-1.5 text-xs font-semibold text-clinic-800 hover:bg-clinic-100"
                >
                  Mark as {reviewStatus === 'reviewed' ? 'Pending' : 'Reviewed'}
                </button>
              )}

            </div>

            <div className="mt-5 space-y-2">

              {(
                [
                  'summary',
                  'conversation',
                  'documents',
                  'timeline'
                ] as const
              ).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                    tab === t
                      ? 'bg-clinic-600 text-white'
                      : 'text-muted hover:bg-clinic-50'
                  }`}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}

            </div>

            <button
              disabled={busy}
              onClick={makeAiSummary}
              className="mt-4 w-full rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy
                ? 'Generating…'
                : 'Generate evidence-grounded summary'}
            </button>

            <button
              onClick={() =>
                downloadJson(
                  buildFhirBundle(
                    complaint,
                    answers,
                    patientProfile,
                    backgroundHistory,
                    documents,
                    safetyFlags,
                    doctorReviews
                  ),
                  'medikiosk-fhir-bundle.json'
                )
              }
              className="mt-3 w-full rounded-lg border border-clinic-200 px-3 py-2 text-sm font-medium text-clinic-700"
            >
              Export FHIR-ready JSON
            </button>

            <button
              onClick={s.resetSession}
              className="mt-3 w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700"
            >
              End & clear demo session
            </button>

          </aside>

          {/* Content */}
          <section className="space-y-5">

            {/* SUMMARY TAB */}
            {tab === 'summary' && (
              <>
                <div className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">

                  <div className="flex flex-wrap items-start justify-between gap-4">

                    <div>

                      <p className="text-xs font-semibold uppercase tracking-wide text-clinic-500">
                        Chief complaint
                      </p>

                      <h2 className="mt-1 font-display text-2xl font-semibold text-ink">
                        {complaint?.displayName || 'Not reported'}
                      </h2>

                      <p className="mt-1 text-sm text-muted">
                        Patient said: “
                        {complaint?.originalInput || 'Not reported'}
                        ”
                      </p>

                    </div>

                    <span className="rounded-full bg-clinic-50 px-3 py-1 text-xs text-clinic-800">
                      Draft · physician controlled
                    </span>

                  </div>
                </div>

                {/* Physician Summary */}
                <div className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between gap-3">

                    <div>

                      <h2 className="font-display text-xl font-semibold text-ink">
                        Physician-ready summary
                      </h2>

                      <p className="text-xs text-muted">
                        {summaryProvider
                          ? `Provider: ${summaryProvider}`
                          : 'Evidence-based local draft'}
                      </p>

                    </div>

                    <button
                      onClick={() =>
                        navigator.clipboard?.writeText(
                          effectiveSummary
                        )
                      }
                      className="rounded-full border border-clinic-200 px-4 py-2 text-sm text-clinic-700"
                    >
                      Copy
                    </button>

                  </div>

                  <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-canvas p-4 text-sm leading-6 text-ink">
                    {effectiveSummary}
                  </pre>

                </div>

                {/* Structured History */}
                <div className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between">

                    <h2 className="font-display text-xl font-semibold text-ink">
                      Structured history
                    </h2>

                    <span className="text-xs text-muted">
                      Confirm each field before clinical use
                    </span>

                  </div>

                  <div className="mt-3 divide-y divide-clinic-50">

                    {Object.entries(answers).map(
                      ([field, value]) => {

                        const ev =
                          evidenceFor(field);

                        /*
                         * IMPORTANT FIX:
                         * The review() function above is kept intact.
                         * We use reviewRecord here to avoid
                         * shadowing the review() function.
                         */
                        const reviewRecord =
                          doctorReviews.find(
                            r => r.field === field
                          );

                        const displayed =
                          reviewRecord?.status === 'edited'
                            ? (
                                reviewRecord.editedValue ??
                                String(valueText(value))
                              )
                            : valueText(value);

                        return (
                          <div
                            key={field}
                            className="py-4"
                          >

                            <div className="grid gap-3 lg:grid-cols-[180px_1fr] lg:items-start">

                              {/* Field label */}
                              <div>

                                <p className="text-sm font-medium text-ink">
                                  {labelField(field)}
                                </p>

                                <p className="text-xs text-muted">
                                  {reviewRecord?.status ||
                                    'unverified'}
                                  {' · '}
                                  {ev?.confidence ||
                                    'medium'}{' '}
                                  confidence
                                </p>

                              </div>

                              {/* Field content */}
                              <div>

                                <input
                                  value={
                                    edits[field] ??
                                    displayed
                                  }
                                  onChange={e =>
                                    setEdits(x => ({
                                      ...x,
                                      [field]:
                                        e.target.value
                                    }))
                                  }
                                  className="w-full rounded-lg border border-clinic-200 p-2.5 text-sm"
                                />

                                <div className="mt-2 flex flex-wrap gap-2">

                                  <span className="rounded-full bg-clinic-50 px-2 py-1 text-xs text-clinic-800">
                                    Source:{' '}
                                    {ev?.source ||
                                      'PATIENT'}
                                  </span>

                                  {ev?.originalAnswer && (
                                    <span className="rounded-full bg-slate-50 px-2 py-1 text-xs text-slate-700">
                                      Original:{' '}
                                      {ev.originalAnswer}
                                    </span>
                                  )}

                                  <button
                                    onClick={() =>
                                      review(
                                        field,
                                        'confirmed'
                                      )
                                    }
                                    className="rounded-full border border-clinic-200 px-3 py-1 text-xs text-clinic-700"
                                  >
                                    Confirm
                                  </button>

                                  <button
                                    onClick={() =>
                                      saveEdit(field)
                                    }
                                    className="rounded-full border border-clinic-200 px-3 py-1 text-xs text-clinic-700"
                                  >
                                    Save edit
                                  </button>

                                  <button
                                    onClick={() =>
                                      review(
                                        field,
                                        'rejected'
                                      )
                                    }
                                    className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700"
                                  >
                                    Reject
                                  </button>

                                </div>

                              </div>

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>

                </div>
              </>
            )}

            {/* CONVERSATION TAB */}
            {tab === 'conversation' && (
              <div className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">

                <h2 className="font-display text-xl font-semibold text-ink">
                  Original patient evidence
                </h2>

                <div className="mt-5 space-y-3">

                  {evidence.map(e => (
                    <div
                      key={`${e.field}-${e.timestamp}`}
                      className="rounded-xl border border-clinic-100 p-4"
                    >

                      <p className="text-xs uppercase tracking-wide text-muted">
                        {labelField(e.field)} ·{' '}
                        {e.language} ·{' '}
                        {e.confidence}
                      </p>

                      <p className="mt-1 text-ink">
                        “{e.originalAnswer}”
                      </p>

                      <p className="mt-1 text-sm text-clinic-700">
                        Normalized:{' '}
                        {String(
                          e.normalizedValue ??
                          'unknown'
                        )}
                      </p>

                    </div>
                  ))}

                </div>

              </div>
            )}

            {/* DOCUMENTS TAB */}
            {tab === 'documents' && (
              <div className="space-y-4">

                <DocumentUpload />

                <div className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">

                  <h2 className="font-display text-xl font-semibold">
                    Document evidence register
                  </h2>

                  {documents.map(d => (
                    <div
                      key={d.id}
                      className="mt-4 rounded-xl bg-canvas p-4"
                    >

                      <p className="font-medium">
                        {d.name}
                      </p>

                      {d.entities.map(
                        (e: any, i: number) => (
                          <p
                            key={i}
                            className="mt-1 text-sm text-muted"
                          >
                            {e.type}: {e.value} ·{' '}
                            {e.confidence} · source:{' '}
                            {e.sourceText}
                          </p>
                        )
                      )}

                    </div>
                  ))}

                </div>

              </div>
            )}

            {/* TIMELINE TAB */}
            {tab === 'timeline' && (
              <div className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">

                <h2 className="font-display text-xl font-semibold">
                  Medical timeline
                </h2>

                {timeline.map((e, i) => (
                  <div
                    key={e.id}
                    className="relative mt-5 pl-7"
                  >

                    <span className="absolute left-1 top-1 h-3 w-3 rounded-full bg-clinic-600" />

                    {i < timeline.length - 1 && (
                      <span className="absolute left-[6px] top-4 h-full w-px bg-clinic-100" />
                    )}

                    <p className="text-xs text-muted">
                      {new Date(
                        e.date
                      ).toLocaleString()}{' '}
                      · {e.source}
                    </p>

                    <p className="font-medium text-ink">
                      {e.title}
                    </p>

                    <p className="text-sm text-muted">
                      {e.detail}
                    </p>

                  </div>
                ))}

              </div>
            )}

          </section>

        </div>

      </main>

    </div>
  );
}