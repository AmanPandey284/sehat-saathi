import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePatientSession } from '../patient/state/PatientSessionContext';
import { buildTimeline, labelField, valueText } from '../history/recordUtils';
import { buildFhirBundle } from '../history/fhir';
import { generateClinicalSummary } from '../history/summaryGenerator';
import {
  generateSummary,
  BASE_URL,
} from '../../services/api';
import DocumentUpload from '../documents/DocumentUpload';
import { detectConflicts } from '../history/conflictEngine';

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

  const [tab, setTab] = useState<
    'summary' | 'conversation' | 'documents' | 'timeline'
  >('summary');

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState('');
  const [summaryProvider, setSummaryProvider] = useState('');
  const [busy, setBusy] = useState(false);

  const answers = s.historyAnswers ?? {};
  const complaint = s.chiefComplaint;

  const conflicts = useMemo(
    () =>
      detectConflicts(
        s.backgroundHistory,
        s.documents
      ),
    [s.backgroundHistory, s.documents]
  );

  const timeline = useMemo(
    () =>
      buildTimeline(
        complaint,
        answers,
        s.documents,
        s.backgroundHistory
      ),
    [
      complaint,
      answers,
      s.documents,
      s.backgroundHistory
    ]
  );

  const effectiveSummary =
    summary ||
    generateClinicalSummary(
      complaint,
      answers,
      s.documents,
      s.backgroundHistory,
      s.patientProfile,
      s.safetyFlags,
      s.doctorReviews
    );

  const evidenceFor = (field: string) =>
    s.evidence.find(e => e.field === field);

  const documentAttentionItems = s.documents.flatMap(
  (doc: any) => doc.attentionItems ?? [],
);

  const makeAiSummary = async () => {
    setBusy(true);

    try {
      const r = await generateSummary({
        complaint,
        history: {
          ...answers,
          ...s.backgroundHistory
        },
        documents: s.documents,
        evidence: s.evidence
      });

      setSummary(r.summary);
      setSummaryProvider(r.provider);
    } catch {
      setSummary(
        generateClinicalSummary(
          complaint,
          answers,
          s.documents,
          s.backgroundHistory,
          s.patientProfile,
          s.safetyFlags,
          s.doctorReviews
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

    s.reviewField({
      field,
      status,
      editedValue:
        status === 'edited'
          ? v
          : undefined,
      reviewedAt:
        new Date().toISOString(),
      reviewer: 'Demo Physician'
    });
  };

  const saveEdit = (field: string) => {
    review(field, 'edited');
  };

  return (
    <div className="min-h-screen bg-canvas">

      {/* Header */}
      <header className="border-b border-clinic-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-clinic-500">
              Sehat Saathi · Physician review
            </p>

            <h1 className="font-display text-2xl font-semibold text-ink">
              Clinical intake dashboard
            </h1>
          </div>

          <div className="flex gap-2">

            <Link
              to="/"
              className="rounded-full border border-clinic-200 px-4 py-2 text-sm text-muted"
            >
              Exit
            </Link>

            <Link
              to="/patient"
              className="rounded-full bg-clinic-600 px-4 py-2 text-sm font-medium text-white"
            >
              New patient
            </Link>

            <Link
              to="/analytics"
              className="rounded-full border border-clinic-200 px-4 py-2 text-sm text-muted"
            >
              Analytics
            </Link>

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
        {s.safetyFlags.length > 0 && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-5">

            <p className="font-semibold text-red-900">
              Priority clinical review
            </p>

            {s.safetyFlags.map(f => (
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
        {/* Document Attention */}
{documentAttentionItems.length > 0 && (
  <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-5">
    <p className="font-semibold text-red-900">
      Doctor attention · extracted documents
    </p>

    <p className="mt-1 text-sm text-red-800">
      These document findings require clinician review.
    </p>

    <div className="mt-4 space-y-3">
      {documentAttentionItems.map(
        (item: any, index: number) => (
          <div
            key={`${item.name}-${index}`}
            className="rounded-xl border border-red-200 bg-white p-4"
          >
            <p className="font-semibold text-ink">
              {item.name}
            </p>

            <p className="mt-1 text-sm">
              Patient result:{" "}
              <strong>
                {item.patientValue ?? "Not available"}
              </strong>
            </p>

            {item.referenceRange && (
              <p className="mt-1 text-sm text-muted">
                Reference: {item.referenceRange}
              </p>
            )}

            {item.comparison && (
              <p className="mt-2 text-sm font-medium text-red-700">
                {item.comparison}
              </p>
            )}

            <p className="mt-1 text-xs text-muted">
              Status: {item.status ?? "Review required"}
            </p>
          </div>
        ),
      )}
    </div>
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

        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">

          {/* Sidebar */}
          <aside className="h-fit rounded-2xl border border-clinic-100 bg-white p-5 shadow-sm">

            <div className="rounded-xl bg-clinic-50 p-4">

              <p className="text-xs uppercase tracking-wide text-muted">
                Patient
              </p>

              <p className="mt-1 font-semibold text-ink">
                {s.patientProfile?.name || 'Anonymous / Demo'}
              </p>

              <p className="text-sm text-muted">
                Age {s.patientProfile?.age || '—'} ·{' '}
                {s.patientProfile?.sex || '—'}
              </p>

              <p className="mt-1 text-xs text-muted">
                ID: {s.patientProfile?.identifier || 'DEMO'}
              </p>

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
                    s.patientProfile,
                    s.backgroundHistory,
                    s.documents,
                    s.safetyFlags,
                    s.doctorReviews
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
                          s.doctorReviews.find(
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

                  {s.evidence.map(e => (
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
  <div className="space-y-5">
    <DocumentUpload />

    {s.documents.map((doc: any) => (
      <DoctorDocumentView
        key={doc.id}
        doc={doc}
      />
    ))}
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

function DoctorDocumentView({ doc }: { doc: any }) {
  const structured = doc.structuredData;
  const attentionItems = doc.attentionItems ?? [];

  const sourceUrl = doc.sourceDocument?.url
    ? doc.sourceDocument.url.startsWith("http")
      ? doc.sourceDocument.url
      : `${BASE_URL}${doc.sourceDocument.url}`
    : null;

  return (
    <div className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">
      {/* DOCUMENT HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-semibold text-ink">
            {doc.name || doc.sourceDocument?.originalName || "Medical Document"}
          </h3>

          <p className="mt-1 text-sm text-muted">
            Uploaded{" "}
            {doc.uploadedAt
              ? new Date(doc.uploadedAt).toLocaleString()
              : "Unknown date"}
          </p>
        </div>

        <span className="rounded-full bg-clinic-50 px-3 py-1 text-xs font-semibold text-clinic-700">
          {doc.extractionStatus || "Processed"}
        </span>
      </div>

      {/* DOCTOR ATTENTION */}
      {attentionItems.length > 0 && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <h4 className="font-semibold text-red-800">
            Doctor Attention
          </h4>

          <div className="mt-3 space-y-3">
            {attentionItems.map((item: any, index: number) => (
              <div
                key={`${item.name || "attention"}-${index}`}
                className="rounded-lg border border-red-200 bg-white p-3"
              >
                <p className="font-semibold text-red-800">
                  {item.name || "Medical result"}
                </p>

                {item.patientValue && (
                  <p className="mt-1 text-sm text-ink">
                    Patient value:{" "}
                    <span className="font-medium">
                      {item.patientValue}
                    </span>
                  </p>
                )}

                {item.referenceRange && (
                  <p className="mt-1 text-sm text-muted">
                    Reference range: {item.referenceRange}
                  </p>
                )}

                {item.comparison && (
                  <p className="mt-1 text-sm text-red-700">
                    {item.comparison}
                  </p>
                )}

                {item.status && (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                    Status: {item.status}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STRUCTURED MEDICAL DATA */}
      {structured && (
        <StructuredDoctorDocument data={structured} />
      )}

      {/* ORIGINAL DOCUMENT */}
      {sourceUrl && (
        <div className="mt-5 rounded-xl border border-clinic-100 bg-canvas p-4">
          <p className="font-semibold text-ink">
            Original source
          </p>

          <p className="mt-1 text-sm text-muted">
            Verify the extracted information against the original document.
          </p>

          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block rounded-full border border-clinic-200 px-4 py-2 text-sm font-medium text-clinic-700"
          >
            View original document
          </a>

          {doc.type?.startsWith("image/") && (
            <img
              src={sourceUrl}
              alt={doc.name || "Original medical document"}
              className="mt-4 max-h-[500px] w-full rounded-xl border border-clinic-100 object-contain"
            />
          )}
        </div>
      )}
    </div>
  );
}


function StructuredDoctorDocument({ data }: { data: any }) {
  return (
    <div className="mt-5 space-y-4">

      {/* PATIENT INFORMATION */}
      {data.patient && (
        <DoctorSection title="Patient Information">
          <DoctorField label="Name" value={data.patient.name} />
          <DoctorField label="Age" value={data.patient.age} />
          <DoctorField label="Sex" value={data.patient.sex} />
          <DoctorField
            label="Date of Birth"
            value={data.patient.dateOfBirth}
          />
          <DoctorField
            label="Patient ID"
            value={data.patient.patientId}
          />
        </DoctorSection>
      )}

      {/* VISIT INFORMATION */}
      {data.visit && (
        <DoctorSection title="Visit Information">
          <DoctorField label="Date" value={data.visit.date} />
          <DoctorField
            label="Department"
            value={data.visit.department}
          />
          <DoctorField label="Doctor" value={data.visit.doctor} />
          <DoctorField
            label="Facility"
            value={data.visit.facility}
          />
        </DoctorSection>
      )}

      {/* CHIEF COMPLAINTS */}
      {Array.isArray(data.chiefComplaints) &&
        data.chiefComplaints.length > 0 && (
          <DoctorSection title="Chief Complaints">
            <div className="space-y-2">
              {data.chiefComplaints.map((item: any, index: number) => (
                <div
                  key={index}
                  className="rounded-lg border border-clinic-100 bg-canvas p-3"
                >
                  <p className="font-medium text-ink">
                    {item.complaint ||
                      item.name ||
                      item.text ||
                      "Complaint"}
                  </p>

                  {item.duration && (
                    <p className="mt-1 text-sm text-muted">
                      Duration: {item.duration}
                    </p>
                  )}

                  {item.severity && (
                    <p className="mt-1 text-sm text-muted">
                      Severity: {item.severity}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </DoctorSection>
        )}

      {/* VITALS */}
      {Array.isArray(data.vitals) && data.vitals.length > 0 && (
        <DoctorSection title="Vitals">
          <div className="space-y-2">
            {data.vitals.map((item: any, index: number) => (
              <MedicalResultRow
                key={index}
                item={item}
              />
            ))}
          </div>
        </DoctorSection>
      )}

      {/* CLINICAL EXAMINATION */}
      {data.clinicalExamination && (
        <DoctorSection title="Clinical Examination">
          {Object.entries(data.clinicalExamination).map(
            ([key, value]: [string, any]) => (
              <DoctorField
                key={key}
                label={key}
                value={value}
              />
            ),
          )}
        </DoctorSection>
      )}

      {/* PREVIOUS VISITS */}
      {Array.isArray(data.previousVisits) &&
        data.previousVisits.length > 0 && (
          <DoctorSection title="Previous Visit History">
            <div className="space-y-3">
              {data.previousVisits.map((visit: any, index: number) => (
                <div
                  key={index}
                  className="rounded-lg border border-clinic-100 bg-canvas p-3"
                >
                  {visit.date && (
                    <p className="font-medium text-ink">
                      {visit.date}
                    </p>
                  )}

                  {visit.complaint && (
                    <p className="mt-1 text-sm text-muted">
                      Complaint: {visit.complaint}
                    </p>
                  )}

                  {visit.diagnosis && (
                    <p className="mt-1 text-sm text-muted">
                      Diagnosis: {visit.diagnosis}
                    </p>
                  )}

                  {visit.treatment && (
                    <p className="mt-1 text-sm text-muted">
                      Treatment: {visit.treatment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </DoctorSection>
        )}

      {/* LABORATORY RESULTS */}
      {Array.isArray(data.laboratoryResults) &&
        data.laboratoryResults.length > 0 && (
          <DoctorSection title="Laboratory Results">
            <div className="space-y-2">
              {data.laboratoryResults.map(
                (item: any, index: number) => (
                  <MedicalResultRow
                    key={index}
                    item={item}
                  />
                ),
              )}
            </div>
          </DoctorSection>
        )}

      {/* DIAGNOSES */}
      {Array.isArray(data.diagnoses) &&
        data.diagnoses.length > 0 && (
          <DoctorSection title="Diagnosis">
            <div className="space-y-2">
              {data.diagnoses.map((item: any, index: number) => (
                <div
                  key={index}
                  className="rounded-lg border border-clinic-100 bg-canvas p-3"
                >
                  <p className="font-medium text-ink">
                    {typeof item === "string"
                      ? item
                      : item.name ||
                        item.diagnosis ||
                        item.text ||
                        "Diagnosis"}
                  </p>

                  {typeof item === "object" && item.type && (
                    <p className="mt-1 text-sm text-muted">
                      Type: {item.type}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </DoctorSection>
        )}

      {/* MEDICATIONS */}
      {Array.isArray(data.medications) &&
        data.medications.length > 0 && (
          <DoctorSection title="Medications">
            <div className="space-y-3">
              {data.medications.map(
                (medicine: any, index: number) => (
                  <div
                    key={index}
                    className="rounded-lg border border-clinic-100 bg-canvas p-3"
                  >
                    <p className="font-semibold text-ink">
                      {medicine.name ||
                        medicine.medicine ||
                        medicine.drug ||
                        "Medicine"}
                    </p>

                    {medicine.dose && (
                      <p className="mt-1 text-sm text-muted">
                        Dose: {medicine.dose}
                      </p>
                    )}

                    {medicine.frequency && (
                      <p className="mt-1 text-sm text-muted">
                        Frequency: {medicine.frequency}
                      </p>
                    )}

                    {medicine.duration && (
                      <p className="mt-1 text-sm text-muted">
                        Duration: {medicine.duration}
                      </p>
                    )}

                    {medicine.route && (
                      <p className="mt-1 text-sm text-muted">
                        Route: {medicine.route}
                      </p>
                    )}

                    {medicine.remarks && (
                      <p className="mt-1 text-sm text-muted">
                        Remarks: {medicine.remarks}
                      </p>
                    )}
                  </div>
                ),
              )}
            </div>
          </DoctorSection>
        )}

      {/* ADVICE */}
      {Array.isArray(data.advice) &&
        data.advice.length > 0 && (
          <DoctorSection title="Advice & Lifestyle Recommendations">
            <div className="space-y-2">
              {data.advice.map((item: any, index: number) => (
                <div
                  key={index}
                  className="rounded-lg border border-clinic-100 bg-canvas p-3 text-sm text-ink"
                >
                  {typeof item === "string"
                    ? item
                    : item.text ||
                      item.advice ||
                      item.description ||
                      "Advice"}
                </div>
              ))}
            </div>
          </DoctorSection>
        )}

      {/* FOLLOW-UP */}
      {data.followUp && (
        <DoctorSection title="Follow-Up">
          <DoctorField
            label="Date"
            value={data.followUp.date}
          />
          <DoctorField
            label="Instructions"
            value={data.followUp.instructions}
          />
          <DoctorField
            label="Plan"
            value={data.followUp.plan}
          />
        </DoctorSection>
      )}
    </div>
  );
}


function MedicalResultRow({ item }: { item: any }) {
  const name =
    item.name ||
    item.test ||
    item.parameter ||
    item.label ||
    "Result";

  const patientValue =
    item.patientValue ??
    item.value ??
    item.result ??
    item.patientResult;

  const referenceRange =
    item.referenceRange ??
    item.normalRange ??
    item.range;

  const comparison =
    item.comparison ??
    item.status;

  const needsAttention =
    item.status === "high" ||
    item.status === "low" ||
    item.status === "outside_range" ||
    item.status === "attention" ||
    item.requiresAttention === true;

  return (
    <div className="rounded-lg border border-clinic-100 bg-canvas p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">
            {name}
          </p>

          <p className="mt-1 text-sm text-ink">
            Patient result:{" "}
            <span className="font-medium">
              {patientValue ?? "Not available"}
            </span>
          </p>

          {referenceRange && (
            <p className="mt-1 text-sm text-muted">
              Reference range: {referenceRange}
            </p>
          )}

          {comparison && (
            <p
              className={`mt-1 text-sm ${
                needsAttention
                  ? "font-medium text-red-700"
                  : "text-muted"
              }`}
            >
              {comparison}
            </p>
          )}
        </div>

        {needsAttention && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            Doctor attention
          </span>
        )}
      </div>
    </div>
  );
}


function DoctorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-clinic-100 bg-white p-4">
      <h4 className="font-display text-lg font-semibold text-ink">
        {title}
      </h4>

      <div className="mt-3 space-y-2">
        {children}
      </div>
    </section>
  );
}


function DoctorField({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1 rounded-lg bg-canvas px-3 py-2">
      <span className="text-sm font-medium text-ink">
        {label}:
      </span>

      <span className="text-sm text-muted">
        {typeof value === "object"
          ? JSON.stringify(value)
          : String(value)}
      </span>
    </div>
  );
}