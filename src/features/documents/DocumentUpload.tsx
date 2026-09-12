import { useState, type ReactNode } from "react";
import { ocrDocument, BASE_URL } from "../../services/api";
import { usePatientSession } from "../patient/state/PatientSessionContext";

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
  const { documents, addDocument, removeDocument } = usePatientSession();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const process = async (file: File) => {
    setBusy(true);
    setMessage(`Reading ${file.name}…`);

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

      addDocument({
        id: crypto.randomUUID(),
        name: r.name,
        type: file.type || r.type,
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

      <label className="mt-5 block cursor-pointer rounded-xl border-2 border-dashed border-clinic-200 p-8 text-center hover:bg-clinic-50">
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
          <p className="font-medium text-ink">
            {doc.name}
          </p>

          <p className="mt-0.5 text-xs text-muted">
            {doc.entities?.length ?? 0} entities extracted
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
  const data = doc.structuredData ?? null;

  const sourceUrl = doc.sourceDocument?.url
    ? `https://sehat-saathi-bce6.onrender.com${doc.sourceDocument.url}`
    : undefined;

  return (
    <div className="space-y-4 border-t border-clinic-100 p-4">
      {doc.attentionItems && doc.attentionItems.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-800">
            ⚠ Values requiring attention
          </p>

          <ul className="mt-2 space-y-1">
            {doc.attentionItems.map((item: any, i: number) => (
              <li key={i} className="text-sm text-amber-900">
                {item.type}: {item.name} — {item.patientValue}
                {item.comparison && ` (${item.comparison})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data ? (
        <div className="space-y-4">
          <Section title="Patient">
            <Field label="Name" value={data.patient?.name} />
            <Field label="Age" value={data.patient?.age} />
            <Field label="Gender" value={data.patient?.gender} />
            <Field label="UHID" value={data.patient?.uhid} />
          </Section>

          <Section title="Visit">
            <Field label="Date" value={data.visit?.visit_date} />
            <Field label="Doctor" value={data.visit?.doctor} />
            <Field
              label="Department"
              value={data.visit?.department}
            />
          </Section>

          <Section title="Chief Complaints">
            {(data.chiefComplaints ?? []).map(
              (item: any, index: number) => (
                <div
                  key={index}
                  className="rounded-lg bg-canvas p-3"
                >
                  <p className="font-medium">
                    {item.complaint}
                  </p>

                  {item.duration && (
                    <p className="mt-1 text-sm text-muted">
                      Duration: {item.duration}
                    </p>
                  )}
                </div>
              ),
            )}
          </Section>

          <Section title="Vitals">
            {(data.vitals ?? []).map(
              (item: any, index: number) => (
                <MedicalResult
                  key={index}
                  item={item}
                />
              ),
            )}
          </Section>

          <Section title="Clinical Examination">
            <Field
              label="General"
              value={data.clinicalExamination?.general}
            />
            <Field
              label="Respiratory"
              value={data.clinicalExamination?.respiratory}
            />
            <Field
              label="Cardiovascular"
              value={
                data.clinicalExamination?.cardiovascular
              }
            />
            <Field
              label="Abdomen"
              value={data.clinicalExamination?.abdomen}
            />
            <Field
              label="CNS"
              value={data.clinicalExamination?.cns}
            />
            <Field
              label="Others"
              value={data.clinicalExamination?.other}
            />
          </Section>

          <Section title="Previous Visits">
            {(data.previousVisits ?? []).map(
              (item: any, index: number) => (
                <div
                  key={index}
                  className="rounded-lg bg-canvas p-3"
                >
                  <p className="font-medium">
                    {item.date}
                  </p>

                  <p className="mt-1 text-sm">
                    Complaints:{" "}
                    {item.complaints ?? "Not reported"}
                  </p>

                  <p className="mt-1 text-sm">
                    Diagnosis:{" "}
                    {item.diagnosis ?? "Not reported"}
                  </p>

                  <p className="mt-1 text-sm">
                    Treatment:{" "}
                    {item.treatment ?? "Not reported"}
                  </p>
                </div>
              ),
            )}
          </Section>

          <Section title="Laboratory Results">
            {(data.laboratoryResults ?? []).map(
              (item: any, index: number) => (
                <MedicalResult
                  key={index}
                  item={item}
                />
              ),
            )}
          </Section>

          <Section title="Diagnoses">
            {(data.diagnoses ?? []).map(
              (item: any, index: number) => (
                <div
                  key={index}
                  className="rounded-lg bg-canvas p-3"
                >
                  {index + 1}. {item.diagnosis}
                </div>
              ),
            )}
          </Section>

          <Section title="Medications">
            {(data.medications ?? []).map(
              (item: any, index: number) => (
                <div
                  key={index}
                  className="rounded-lg bg-canvas p-4"
                >
                  <p className="font-semibold">
                    {index + 1}. {item.name}
                  </p>

                  <Field label="Dose" value={item.dose} />
                  <Field
                    label="Frequency"
                    value={item.frequency}
                  />
                  <Field
                    label="Duration"
                    value={item.duration}
                  />
                  <Field
                    label="Remarks"
                    value={item.remarks}
                  />
                </div>
              ),
            )}
          </Section>

          <Section title="Advice">
            {(data.advice ?? []).map(
              (item: any, index: number) => (
                <div
                  key={index}
                  className="rounded-lg bg-canvas p-3"
                >
                  • {item.text}
                </div>
              ),
            )}
          </Section>

          <Section title="Follow-Up">
            <Field
              label="Date"
              value={data.followUp?.date}
            />
            <Field
              label="Instruction"
              value={data.followUp?.instruction}
            />
          </Section>
        </div>
      ) : (
        <div className="mt-5 rounded-lg bg-canvas p-4 text-sm text-muted">
          Structured medical data is not available for this document.
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-clinic-600 px-4 py-2 text-sm font-medium text-white"
          >
            Open Original
          </a>
        )}

        <button
          type="button"
          onClick={() => setShowRaw((value) => !value)}
          className="rounded-full border border-clinic-200 px-4 py-2 text-sm font-medium text-clinic-700"
        >
          {showRaw ? "Hide OCR text" : "View OCR text"}
        </button>
      </div>

      {showRaw && (
        <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs text-slate-700">
          {doc.text || "No OCR text available."}
        </pre>
      )}

      {doc.previewUrl && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-ink">
            Original source
          </p>

          <img
            src={doc.previewUrl}
            alt="Original medical document"
            className="mt-3 max-h-[700px] w-full rounded-xl border object-contain"
          />
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
            {item.referenceRange ?? "Not available"}
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
