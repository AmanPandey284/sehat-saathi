import { useState, useEffect, type ReactNode } from "react";
import { ocrDocument, BASE_URL } from "../../services/api";
import { usePatientSession } from "../patient/state/PatientSessionContext";
import { getAuthorizationHeader } from "../../services/authStorage";

// ---------------------------------------------------------------------------
// Fix 4: pre-warm the Render backend before every OCR upload so the
//         cold-start penalty (30–90 s) is absorbed before the heavy OCR
//         request hits the server.
// ---------------------------------------------------------------------------
async function warmBackend(): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/health`, { method: "GET" });
  } catch {
    // Ignore – warming is best-effort; the real OCR request will still proceed.
  }
}

export default function DocumentUpload() {
  const { documents, addDocument, removeDocument, updateTimestamps } = usePatientSession();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [docCategory, setDocCategory] = useState<
    'prescription' | 'lab_report' | 'ecg_radiology' | 'consultation_record'
  >('prescription');

  const process = async (file: File) => {
    setBusy(true);
    setMessage(`Reading ${file.name}…`);
    updateTimestamps({ documentProcessingStartedAt: new Date().toISOString() });

    // Fire the warm-up ping concurrently so it has as much lead time as
    // possible before the actual OCR request is sent.
    const warmPromise = warmBackend();

    try {
      // Await warm-up before dispatching the heavy OCR upload.
      await warmPromise;

      const r: any = await ocrDocument(file);
      const previewUrl = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined;

      // Ensure entities are populated from backend structured data if entities array is omitted
      const extractedEntities = Array.isArray(r.entities) && r.entities.length > 0
        ? r.entities
        : (() => {
            const list: Array<{
              type: string;
              value: string;
              confidence: "high" | "medium" | "low";
              sourceText: string;
              page?: number;
            }> = [];
            const sd = r.structuredData;
            if (sd) {
              if (Array.isArray(sd.vitals)) {
                for (const v of sd.vitals) {
                  if (v.name && v.patientValue) {
                    list.push({
                      type: "Vital",
                      value: `${v.name}: ${v.patientValue}`,
                      confidence: "high",
                      sourceText: `${v.name}: ${v.patientValue}`,
                    });
                  }
                }
              }
              if (Array.isArray(sd.medications)) {
                for (const m of sd.medications) {
                  if (m.name) {
                    list.push({
                      type: "Medication",
                      value: [m.name, m.dose, m.frequency].filter(Boolean).join(" "),
                      confidence: "high",
                      sourceText: m.name,
                    });
                  }
                }
              }
              if (Array.isArray(sd.diagnoses)) {
                for (const d of sd.diagnoses) {
                  if (d.diagnosis) {
                    list.push({
                      type: "Diagnosis",
                      value: d.diagnosis,
                      confidence: "high",
                      sourceText: d.diagnosis,
                    });
                  }
                }
              }
              if (Array.isArray(sd.laboratoryResults)) {
                for (const l of sd.laboratoryResults) {
                  if (l.testName && l.patientValue) {
                    list.push({
                      type: "Lab",
                      value: `${l.testName}: ${l.patientValue}`,
                      confidence: "high",
                      sourceText: `${l.testName}: ${l.patientValue}`,
                    });
                  }
                }
              }
              if (Array.isArray(sd.chiefComplaints)) {
                for (const c of sd.chiefComplaints) {
                  if (c.complaint) {
                    list.push({
                      type: "Complaint",
                      value: c.complaint + (c.duration ? ` (${c.duration})` : ""),
                      confidence: "high",
                      sourceText: c.complaint,
                    });
                  }
                }
              }
            }
            return list;
          })();

      const categoryLabel =
        docCategory === 'prescription'
          ? 'Prescription'
          : docCategory === 'lab_report'
          ? 'Laboratory Report'
          : docCategory === 'ecg_radiology'
          ? 'ECG / Radiology'
          : 'Previous Consultation';

      addDocument({
        id: crypto.randomUUID(),
        name: r.name,
        type: categoryLabel,
        uploadedAt: r.processedAt,
        text: r.text,
        extractionStatus:
          r.extractionStatus === "extracted"
            ? "extracted"
            : "ocr",
        entities: extractedEntities,
        pages: r.pages ?? [],
        previewUrl,
        structuredData: r.structuredData ?? null,
        attentionItems: r.attentionItems ?? [],
        sourceDocument: r.sourceDocument ?? null,
      } as any);

      updateTimestamps({ documentProcessingCompletedAt: new Date().toISOString() });
      setMessage(`${file.name} processed successfully.`);
    } catch (error) {
      // Fix 3: surface a clear timeout/abort message so the user knows to
      // retry rather than seeing the spinner frozen forever.
      const msg =
        error instanceof Error
          ? error.name === "AbortError"
            ? "OCR is taking longer than expected — please try again. (The server may need a moment to warm up.)"
            : error.message
          : "Could not process this document.";
      setMessage(msg);
    } finally {
      setBusy(false);
    }
  };

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;

    const file = files[0];

    if (file.size > 8 * 1024 * 1024) {
      setMessage("Please choose a file smaller than 8 MB.");
      return;
    }

    void process(file);
  };

  return (
    <section className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">
          Previous medical records
        </h2>

        <p className="mt-1 text-sm text-muted">
          Upload a prescription, laboratory report or discharge summary.
          Sehat Saathi extracts the medical information into structured
          sections.
        </p>
      </div>

      {/* Historical Provenance & Safety Notice */}
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
        <span className="text-base leading-none">⚠️</span>
        <div>
          <span className="font-bold">Historical records — not current diagnosis:</span>{' '}
          All extracted medications, laboratory values and clinical notes are organized as reference
          material for the attending doctor. They do not constitute an autonomous medical finding.
        </div>
      </div>

      {/* Document Categorization Chips */}
      <div className="mt-5">
        <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
          Select Document Category Before Upload
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { id: 'prescription', label: 'Prescription', icon: '💊' },
            { id: 'lab_report', label: 'Lab Report', icon: '🔬' },
            { id: 'ecg_radiology', label: 'ECG / Radiology', icon: '🫀' },
            { id: 'consultation_record', label: 'Consultation', icon: '📋' },
          ].map((cat) => {
            const isSelected = docCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setDocCategory(cat.id as any)}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                  isSelected
                    ? 'border-clinic-600 bg-clinic-50 text-clinic-800 shadow-xs ring-1 ring-clinic-600'
                    : 'border-clinic-200 bg-white text-muted hover:border-clinic-300 hover:text-ink'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="mt-4 block cursor-pointer rounded-xl border-2 border-dashed border-clinic-200 p-8 text-center hover:bg-clinic-50">
        <span className="font-medium text-clinic-700">
          Choose image, PDF or text document
        </span>

        <span className="mt-1 block text-sm text-muted">
          Maximum 8 MB
        </span>

        <input
          className="sr-only"
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.csv,.md"
          disabled={busy}
          onChange={(e) => onFiles(e.target.files)}
        />
      </label>

      {busy && (
        <p className="mt-4 animate-pulse text-sm text-muted">
          {message}
        </p>
      )}

      {!busy && message && (
        <p
          className={`mt-4 text-sm ${
            message.includes("successfully")
              ? "text-emerald-700"
              : "text-red-700"
          }`}
        >
          {message}
        </p>
      )}

      {documents.length > 0 && (
        <ul className="mt-6 space-y-4">
          {documents.map((doc) => (
            <li key={doc.id}>
              <StructuredDocumentCard
                doc={doc}
                onRemove={() => removeDocument(doc.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StructuredDocumentCard({
  doc,
  onRemove,
}: {
  doc: any;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-xl border border-clinic-100 bg-canvas">
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-ink">
              {doc.name}
            </p>
            {doc.type && (
              <span className="rounded-full bg-clinic-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-clinic-800 border border-clinic-200">
                {doc.type}
              </span>
            )}
          </div>

          <p className="mt-0.5 text-xs text-muted">
            {doc.entities?.length ?? 0} entities extracted · Provisional record
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-full border border-clinic-200 px-3 py-1 text-xs font-medium text-clinic-700"
          >
            {open ? "Collapse" : "View"}
          </button>

          <button
            type="button"
            onClick={onRemove}
            className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-700"
          >
            Remove
          </button>
        </div>
      </div>

      {open && (
        <ExpandedDocumentView doc={doc} />
      )}
    </article>
  );
}

function ExpandedDocumentView({ doc }: { doc: any }) {
  const [showRaw, setShowRaw] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [selectedPage, setSelectedPage] = useState(1);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctKey, setCorrectKey] = useState("");
  const [correctVal, setCorrectVal] = useState("");
  const [correctReason, setCorrectReason] = useState("");
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  const data = doc.structuredData ?? null;
  const pages: Array<{ page: number; text: string; confidence?: string }> = doc.pages ?? [];

  const previewUrl = doc.sourceDocument?.previewUrl
    ? `${BASE_URL}${doc.sourceDocument.previewUrl}`
    : doc.previewUrl || (doc.sourceDocument?.url ? `${BASE_URL}${doc.sourceDocument.url}` : undefined);

  const downloadUrl = doc.sourceDocument?.downloadUrl
    ? `${BASE_URL}${doc.sourceDocument.downloadUrl}`
    : undefined;

  const storedName = doc.sourceDocument?.storedName;

  const isPdf =
    doc.type?.toLowerCase() === "pdf" ||
    doc.mimeType?.includes("pdf") ||
    doc.sourceDocument?.mimeType?.includes("pdf") ||
    doc.sourceDocument?.originalName?.toLowerCase().endsWith(".pdf") ||
    doc.name?.toLowerCase().endsWith(".pdf") ||
    previewUrl?.toLowerCase().includes(".pdf");

  useEffect(() => {
    if (!storedName) return;
    const authHeaders = getAuthorizationHeader();
    fetch(`${BASE_URL}/api/documents/${storedName}/corrections`, {
      headers: authHeaders,
    })
      .then(async (res) => {
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) setCorrections(list);
        }
      })
      .catch(() => {});
  }, [storedName]);

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storedName || !correctKey.trim() || !correctVal.trim()) return;

    setSubmittingCorrection(true);
    try {
      const authHeaders = getAuthorizationHeader();
      const res = await fetch(`${BASE_URL}/api/documents/${storedName}/corrections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          field_key: correctKey.trim(),
          original_value: "",
          corrected_value: correctVal.trim(),
          reason: correctReason.trim(),
        }),
      });

      if (res.ok) {
        const resData = await res.json();
        setCorrections((prev) => [...prev, resData.correction]);
        setShowCorrectionForm(false);
        setCorrectKey("");
        setCorrectVal("");
        setCorrectReason("");
      }
    } catch {} finally {
      setSubmittingCorrection(false);
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(250, z + 25));
  const handleZoomOut = () => setZoom((z) => Math.max(50, z - 25));
  const handleResetZoom = () => { setZoom(100); setRotation(0); };
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  return (
    <div className="space-y-5 border-t border-clinic-100 p-4 sm:p-6 bg-slate-50/40 rounded-b-xl">
      {/* Review Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-clinic-100 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Verification State:</span>
          {corrections.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
              ✏️ USER_CORRECTED ({corrections.length})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
              📄 DOCUMENT_EXTRACTED
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {storedName && (
            <button
              type="button"
              onClick={() => setShowCorrectionForm((v) => !v)}
              className="rounded-lg border border-clinic-200 bg-clinic-50/70 px-3 py-1.5 text-xs font-semibold text-clinic-700 hover:bg-clinic-100 transition shadow-2xs"
            >
              {showCorrectionForm ? "Cancel Correction" : "✏️ Correct Field"}
            </button>
          )}
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 underline"
            >
              📥 Download File
            </a>
          )}
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            {showRaw ? "Hide Raw OCR" : "Inspect Raw OCR"}
          </button>
        </div>
      </div>

      {/* Field Correction Modal / Inline Form */}
      {showCorrectionForm && (
        <form onSubmit={handleSaveCorrection} className="rounded-xl border border-clinic-200 bg-white p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-clinic-700">Submit Clinical Value Correction</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600">Field Name / Key</label>
              <input
                type="text"
                value={correctKey}
                onChange={(e) => setCorrectKey(e.target.value)}
                placeholder="e.g. Hemoglobin or Pulse"
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600">Corrected Value</label>
              <input
                type="text"
                value={correctVal}
                onChange={(e) => setCorrectVal(e.target.value)}
                placeholder="e.g. 13.8 g/dL"
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600">Reason for Correction</label>
            <input
              type="text"
              value={correctReason}
              onChange={(e) => setCorrectReason(e.target.value)}
              placeholder="e.g. OCR misread comma as period"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCorrectionForm(false)}
              className="px-3 py-1 rounded text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingCorrection}
              className="px-3.5 py-1 rounded bg-clinic-600 text-white text-xs font-medium hover:bg-clinic-700 disabled:opacity-50"
            >
              {submittingCorrection ? "Saving..." : "Save Correction"}
            </button>
          </div>
        </form>
      )}

      {/* Corrections List */}
      {corrections.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-800 mb-2">Verified Corrections Audit</p>
          <div className="space-y-1.5">
            {corrections.map((c, i) => (
              <div key={i} className="text-xs text-blue-900 flex flex-wrap items-center gap-2">
                <span className="font-semibold">{c.field_key}:</span>
                <span className="bg-white px-2 py-0.5 rounded border border-blue-200 font-mono">{c.corrected_value}</span>
                {c.reason && <span className="text-slate-500 italic">({c.reason})</span>}
                <span className="text-[10px] text-slate-400">by {c.author_role || c.author || 'reviewer'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw OCR Text */}
      {showRaw && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Raw Extracted Document Stream</p>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3.5 text-xs font-mono text-emerald-400">
            {doc.text || "No text detected."}
          </pre>
        </div>
      )}

      {/* Document Workstation: Side-by-side or stacked preview with zoom / rotate controls */}
      {previewUrl && (
        <div className="rounded-xl border border-clinic-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Source Viewer</span>
              {pages.length > 1 && (
                <div className="flex items-center gap-1 ml-3 text-xs">
                  <span className="text-slate-500">Page:</span>
                  {pages.map((p) => (
                    <button
                      key={p.page}
                      type="button"
                      onClick={() => setSelectedPage(p.page)}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        selectedPage === p.page
                          ? "bg-teal-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {p.page}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Viewer Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom Out"
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center"
              >
                −
              </button>
              <span className="text-xs font-mono text-slate-600 px-1">{zoom}%</span>
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In"
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleRotate}
                title="Rotate 90°"
                className="px-2.5 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center justify-center gap-1"
              >
                ↻ 90°
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                title="Reset View"
                className="px-2 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-500"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Document Preview Frame */}
          <div className="overflow-auto max-h-[500px] flex items-center justify-center bg-slate-900/5 p-4 rounded-lg border border-slate-100">
            {isPdf ? (
              <iframe
                src={previewUrl}
                title="PDF Document Preview"
                className="w-full h-[450px] rounded border"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Document Source"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                  transition: "transform 0.2s ease-out",
                }}
                className="max-h-[450px] object-contain rounded shadow-xs"
              />
            )}
          </div>
        </div>
      )}

      {/* Attention Items Banner */}
      {doc.attentionItems && doc.attentionItems.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-800 text-xs uppercase tracking-wider">
            ⚠ Attention: Values Requiring Clinical Review
          </p>
          <ul className="mt-2 space-y-1">
            {doc.attentionItems.map((item: any, i: number) => (
              <li key={i} className="text-xs text-amber-900 font-medium">
                • {item.type}: {item.name} — {item.patientValue}
                {item.comparison && ` (${item.comparison})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Structured Medical Data with Correction Controls */}
      {data ? (
        <div className="space-y-4">
          {/* Patient Details */}
          <Section title="Patient Demographics">
            <Field label="Name" value={data.patient?.name} />
            <Field label="Age" value={data.patient?.age} />
            <Field label="Gender" value={data.patient?.gender} />
            <Field label="UHID / Reg No" value={data.patient?.uhid} />
          </Section>

          {/* Visit Information */}
          <Section title="Encounter / Visit Details">
            <Field label="Visit Date" value={data.visit?.visit_date} />
            <Field label="Department" value={data.visit?.department} />
            <Field label="Physician" value={data.visit?.doctor} />
          </Section>

          {/* Vitals */}
          {data.vitals && data.vitals.length > 0 && (
            <Section title="Vital Signs">
              <div className="grid gap-2 sm:grid-cols-2">
                {data.vitals.map((v: any, i: number) => (
                  <MedicalResult key={i} item={v} />
                ))}
              </div>
            </Section>
          )}

          {/* Laboratory Results */}
          {data.laboratoryResults && data.laboratoryResults.length > 0 && (
            <Section title="Laboratory Investigations">
              <div className="grid gap-2 sm:grid-cols-2">
                {data.laboratoryResults.map((lab: any, i: number) => (
                  <MedicalResult key={i} item={lab} />
                ))}
              </div>
            </Section>
          )}

          {/* Medications */}
          {data.medications && data.medications.length > 0 && (
            <Section title="Documented Medications">
              <div className="space-y-2">
                {data.medications.map((m: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-slate-100 bg-white p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{idx + 1}. {m.name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-mono">
                        {m.reviewStatus || "DOCUMENT_EXTRACTED"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                      {m.dosage && <span>Dose: <strong>{m.dosage}</strong></span>}
                      {m.frequency && <span>Freq: <strong>{m.frequency}</strong></span>}
                      {m.duration && <span>Duration: <strong>{m.duration}</strong></span>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white p-4 text-xs text-muted border border-slate-100">
          No structured clinical fields parsed. Please view raw OCR stream above.
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-clinic-100 bg-white p-4">
      <h3 className="font-semibold text-ink">
        {title}
      </h3>

      <div className="mt-3 space-y-2">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: unknown;
}) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  return (
    <p className="text-sm">
      <span className="font-medium">{label}:</span>{" "}
      <span>{String(value)}</span>
    </p>
  );
}

function MedicalResult({ item }: { item: any }) {
  const attention = Boolean(item.attention);

  return (
    <div
      className={`rounded-xl border p-4 ${
        attention
          ? "border-red-200 bg-red-50"
          : "border-clinic-100 bg-canvas"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">
          {item.name ?? item.testName ?? "Medical result"}
        </p>

        {attention && (
          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
            Attention
          </span>
        )}
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <p>
          Patient result:{" "}
          <strong>
            {item.patientValue ?? "Not reported"}
          </strong>
        </p>

        {item.previousValue && (
          <p>
            Previous:{" "}
            <strong>{item.previousValue}</strong>
          </p>
        )}

        <p>
          Reference:{" "}
          <strong>
            {item.referenceRange ?? item.reference_range ?? "Not available"}
          </strong>
        </p>

        {item.status && (
          <p>
            Status: <strong>{item.status}</strong>
          </p>
        )}
      </div>

      {item.comparison && (
        <p
          className={`mt-2 text-sm font-medium ${
            attention
              ? "text-red-700"
              : "text-clinic-700"
          }`}
        >
          {item.comparison}
        </p>
      )}
    </div>
  );
}
