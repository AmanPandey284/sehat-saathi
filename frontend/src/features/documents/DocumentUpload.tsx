import { useState } from "react";
import { ocrDocument } from "../../services/api";
import { usePatientSession } from "../patient/state/PatientSessionContext";

type MedicalDocumentResponse = {
  name: string;
  type: string;
  processedAt: string;
  extractionStatus: string;
  text: string;
  pages: any[];
  entities: any[];
  structuredData?: {
    patient?: Record<string, any>;
    visit?: Record<string, any>;
    chiefComplaints?: any[];
    vitals?: any[];
    clinicalExamination?: Record<string, any>;
    previousVisits?: any[];
    laboratoryResults?: any[];
    diagnoses?: any[];
    medications?: any[];
    advice?: any[];
    followUp?: Record<string, any>;
  };
  attentionItems?: any[];
  sourceDocument?: {
    originalName: string;
    storedName: string;
    url: string;
  };
};

export default function DocumentUpload() {
  const { documents, addDocument, removeDocument } =
    usePatientSession();

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const process = async (file: File) => {
    setBusy(true);
    setMessage(`Reading ${file.name}…`);

    try {
      const r =
        (await ocrDocument(
          file,
        )) as MedicalDocumentResponse;

      addDocument({
        id: crypto.randomUUID(),
        name: r.name,
        type: file.type || r.type,
        uploadedAt: r.processedAt,
        text: r.text,
        extractionStatus:
          r.extractionStatus === "structured"
            ? "extracted"
            : "ocr",
        entities: r.entities ?? [],
        pages: r.pages ?? [],

        // NEW
        structuredData: r.structuredData ?? null,
        attentionItems: r.attentionItems ?? [],
        sourceDocument:
          r.sourceDocument ?? null,

        // Local preview for the current browser session.
        previewUrl:
          file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
      });

      setMessage(
        `${file.name} processed successfully.`,
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Could not process this document.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onFiles = (
    files: FileList | null,
  ) => {
    if (!files?.length) return;

    const file = files[0];

    if (file.size > 8 * 1024 * 1024) {
      setMessage(
        "Please choose a file smaller than 8 MB.",
      );
      return;
    }

    void process(file);
  };

  return (
    <section className="rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">
            Previous medical records
          </h2>

          <p className="mt-1 text-sm text-muted">
            Upload a prescription, lab report or discharge
            summary. The original document is preserved while
            its medical information is structured.
          </p>
        </div>

        <button
          onClick={() =>
            addDocument({
              id: crypto.randomUUID(),
              name: "Demo_Lab_Report.txt",
              type: "text/plain",
              uploadedAt:
                new Date().toISOString(),
              text:
                "Date: 14 Aug 2026\n" +
                "Hemoglobin: 10.2 g/dL\n" +
                "Glucose: 156 mg/dL\n" +
                "Medication: Metformin 500 mg\n" +
                "History: Diabetes",
              extractionStatus: "extracted",

              entities: [],

              structuredData: {
                patient: {},
                visit: {
                  visit_date:
                    "14 Aug 2026",
                },

                chiefComplaints: [],

                vitals: [],

                clinicalExamination: {},

                previousVisits: [],

                laboratoryResults: [
                  {
                    testName: "Hemoglobin",
                    patientValue:
                      "10.2 g/dL",
                    previousValue: null,
                    referenceRange:
                      "13.0–17.0 g/dL",
                    referenceSource:
                      "demo-reference",
                    status:
                      "below_reference",
                    attention: true,
                    comparison:
                      "Below configured reference range",
                  },

                  {
                    testName: "Glucose",
                    patientValue:
                      "156 mg/dL",
                    previousValue: null,
                    referenceRange:
                      "Report range required",
                    referenceSource:
                      "not_available",
                    status:
                      "not_assessed",
                    attention: false,
                    comparison:
                      "No validated reference range configured",
                  },
                ],

                diagnoses: [
                  {
                    diagnosis: "Diabetes",
                    status: "reported history",
                  },
                ],

                medications: [
                  {
                    name:
                      "Metformin 500 mg",
                    dose: null,
                    frequency: null,
                    duration: null,
                    remarks: null,
                  },
                ],

                advice: [],

                followUp: {},
              },

              attentionItems: [
                {
                  type: "Laboratory",
                  name: "Hemoglobin",
                  patientValue:
                    "10.2 g/dL",
                  referenceRange:
                    "13.0–17.0 g/dL",
                  status:
                    "below_reference",
                  comparison:
                    "Below configured reference range",
                },
              ],

              sourceDocument: null,

              pages: [
                {
                  page: 1,
                  text:
                    "Date: 14 Aug 2026\n" +
                    "Hemoglobin: 10.2 g/dL\n" +
                    "Glucose: 156 mg/dL\n" +
                    "Medication: Metformin 500 mg\n" +
                    "History: Diabetes",
                  confidence: "high",
                },
              ],
            })
          }
          className="rounded-full border border-clinic-200 px-4 py-2 text-sm font-medium text-clinic-700"
        >
          Add demo report
        </button>
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
          accept=".pdf,.txt,.csv,.md,image/*"
          onChange={(e) =>
            onFiles(e.target.files)
          }
        />
      </label>

      {busy && (
        <p className="mt-3 text-sm text-muted">
          {message}
        </p>
      )}

      {!busy && message && (
        <p className="mt-3 text-sm text-clinic-700">
          {message}
        </p>
      )}

      <div className="mt-5 space-y-4">
        {documents.map((doc: any) => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            onRemove={() =>
              removeDocument(doc.id)
            }
          />
        ))}
      </div>
    </section>
  );
}

function DocumentCard({
  doc,
  onRemove,
}: {
  doc: any;
  onRemove: () => void;
}) {
  const [show, setShow] =
    useState(false);

  const structured =
    doc.structuredData;

  const attentionItems =
    doc.attentionItems ?? [];

  const sourceDocument =
    doc.sourceDocument;

  return (
    <article className="rounded-xl border border-clinic-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">
            {doc.name}
          </p>

          <p className="text-xs text-muted">
            Original document → OCR →
            structured medical extraction
            {" · "}
            {new Date(
              doc.uploadedAt,
            ).toLocaleString()}
          </p>
        </div>

        <button
          onClick={onRemove}
          className="text-sm text-flag-700"
        >
          Remove
        </button>
      </div>

      {attentionItems.length > 0 && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-800">
            Doctor attention
          </p>

          <div className="mt-3 space-y-3">
            {attentionItems.map(
              (
                item: any,
                index: number,
              ) => (
                <div
                  key={`${item.name}-${index}`}
                  className="rounded-lg border border-red-200 bg-white p-3"
                >
                  <p className="font-medium text-ink">
                    {item.name}
                  </p>

                  <p className="mt-1 text-sm">
                    Patient result:{" "}
                    <strong>
                      {item.patientValue}
                    </strong>
                  </p>

                  {item.referenceRange && (
                    <p className="mt-1 text-sm text-muted">
                      Reference:{" "}
                      {item.referenceRange}
                    </p>
                  )}

                  <p className="mt-1 text-sm font-medium text-red-700">
                    {item.comparison}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {structured && (
        <StructuredMedicalSummary
          data={structured}
        />
      )}

      {sourceDocument?.url && (
        <OriginalDocument
          document={sourceDocument}
          previewUrl={doc.previewUrl}
        />
      )}

      <button
        onClick={() =>
          setShow(!show)
        }
        className="mt-4 text-sm font-medium text-clinic-700"
      >
        {show
          ? "Hide OCR evidence"
          : "View OCR evidence"}
      </button>

      {show && (
        <div className="mt-3 max-h-56 overflow-auto rounded-lg bg-canvas p-4 text-xs text-muted whitespace-pre-wrap">
          {doc.text ||
            "No OCR text extracted."}
        </div>
      )}
    </article>
  );
}

function StructuredMedicalSummary({
  data,
}: {
  data: any;
}) {
  return (
    <div className="mt-5 space-y-5">
      <Section
        title="Patient Information"
      >
        <KeyValue
          label="Name"
          value={data.patient?.name}
        />

        <KeyValue
          label="Age"
          value={data.patient?.age}
        />

        <KeyValue
          label="Gender"
          value={data.patient?.gender}
        />

        <KeyValue
          label="Patient ID"
          value={data.patient?.patient_id}
        />

        <KeyValue
          label="Contact"
          value={data.patient?.contact}
        />

        <KeyValue
          label="Address"
          value={data.patient?.address}
        />

        <KeyValue
          label="Allergies"
          value={data.patient?.allergies}
        />
      </Section>

      <Section title="Visit Information">
        <KeyValue
          label="Date"
          value={data.visit?.visit_date}
        />

        <KeyValue
          label="Time"
          value={
            data.visit
              ?.consultation_time
          }
        />

        <KeyValue
          label="Doctor"
          value={data.visit?.doctor}
        />

        <KeyValue
          label="Department"
          value={data.visit?.department}
        />

        <KeyValue
          label="Visit Type"
          value={data.visit?.visit_type}
        />
      </Section>

      <Section title="Chief Complaints">
        <div className="space-y-2">
          {(data.chiefComplaints ?? []).map(
            (item: any, index: number) => (
              <div
                key={index}
                className="rounded-lg border border-clinic-50 p-3"
              >
                <p className="font-medium">
                  {index + 1}.{" "}
                  {item.complaint}
                </p>

                {item.duration && (
                  <p className="text-sm text-muted">
                    Duration:{" "}
                    {item.duration}
                  </p>
                )}
              </div>
            ),
          )}
        </div>
      </Section>

      <Section title="Vitals">
        <div className="space-y-3">
          {(data.vitals ?? []).map(
            (item: any, index: number) => (
              <MedicalResult
                key={index}
                name={item.name}
                patientValue={
                  item.patientValue
                }
                referenceRange={
                  item.reference_range ??
                  item.referenceRange
                }
                status={item.status}
                comparison={
                  item.comparison
                }
                attention={
                  item.attention
                }
              />
            ),
          )}
        </div>
      </Section>

      <Section title="Clinical Examination">
        <KeyValue
          label="General"
          value={data.clinicalExamination?.general}
        />

        <KeyValue
          label="Respiratory"
          value={
            data.clinicalExamination
              ?.respiratory
          }
        />

        <KeyValue
          label="Cardiovascular"
          value={
            data.clinicalExamination
              ?.cardiovascular
          }
        />

        <KeyValue
          label="Abdomen"
          value={
            data.clinicalExamination
              ?.abdomen
          }
        />

        <KeyValue
          label="CNS"
          value={
            data.clinicalExamination?.cns
          }
        />

        <KeyValue
          label="Other"
          value={
            data.clinicalExamination?.other
          }
        />
      </Section>

      <Section title="Previous Visits">
        <div className="space-y-2">
          {(data.previousVisits ?? []).map(
            (item: any, index: number) => (
              <div
                key={index}
                className="rounded-lg border border-clinic-50 p-3"
              >
                <p className="font-medium">
                  {item.date}
                </p>

                <p className="text-sm">
                  Complaints:{" "}
                  {item.complaints ??
                    "Not recorded"}
                </p>

                <p className="text-sm">
                  Diagnosis:{" "}
                  {item.diagnosis ??
                    "Not recorded"}
                </p>

                <p className="text-sm">
                  Treatment:{" "}
                  {item.treatment ??
                    "Not recorded"}
                </p>
              </div>
            ),
          )}
        </div>
      </Section>

      <Section title="Laboratory Results">
        <div className="space-y-3">
          {(data.laboratoryResults ?? []).map(
            (item: any, index: number) => (
              <MedicalResult
                key={index}
                name={item.testName}
                patientValue={
                  item.patientValue
                }
                previousValue={
                  item.previousValue
                }
                referenceRange={
                  item.referenceRange
                }
                status={item.status}
                comparison={
                  item.comparison
                }
                attention={
                  item.attention
                }
              />
            ),
          )}
        </div>
      </Section>

      <Section title="Diagnoses">
        <div className="space-y-2">
          {(data.diagnoses ?? []).map(
            (item: any, index: number) => (
              <div
                key={index}
                className="rounded-lg border border-clinic-50 p-3"
              >
                <p className="font-medium">
                  {index + 1}.{" "}
                  {item.diagnosis}
                </p>

                {item.status && (
                  <p className="text-xs text-muted">
                    {item.status}
                  </p>
                )}
              </div>
            ),
          )}
        </div>
      </Section>

      <Section title="Medications">
        <div className="space-y-2">
          {(data.medications ?? []).map(
            (item: any, index: number) => (
              <div
                key={index}
                className="rounded-lg border border-clinic-50 p-3"
              >
                <p className="font-medium">
                  {index + 1}.{" "}
                  {item.name}
                </p>

                <div className="mt-1 grid gap-1 text-sm text-muted sm:grid-cols-2">
                  {item.dose && (
                    <span>
                      Dose: {item.dose}
                    </span>
                  )}

                  {item.frequency && (
                    <span>
                      Frequency:{" "}
                      {item.frequency}
                    </span>
                  )}

                  {item.duration && (
                    <span>
                      Duration:{" "}
                      {item.duration}
                    </span>
                  )}

                  {item.remarks && (
                    <span>
                      Remarks:{" "}
                      {item.remarks}
                    </span>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      </Section>

      <Section title="Advice">
        <div className="space-y-2">
          {(data.advice ?? []).map(
            (item: any, index: number) => (
              <div
                key={index}
                className="rounded-lg border border-clinic-50 p-3"
              >
                • {item.text}
              </div>
            ),
          )}
        </div>
      </Section>

      <Section title="Follow-Up">
        <KeyValue
          label="Date"
          value={data.followUp?.date}
        />

        <KeyValue
          label="Instruction"
          value={
            data.followUp
              ?.instruction
          }
        />
      </Section>
    </div>
  );
}

function MedicalResult({
  name,
  patientValue,
  previousValue,
  referenceRange,
  status,
  comparison,
  attention,
}: {
  name: string;
  patientValue?: string;
  previousValue?: string;
  referenceRange?: string;
  status?: string;
  comparison?: string;
  attention?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        attention
          ? "border-red-200 bg-red-50"
          : "border-clinic-100 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-ink">
          {name}
        </p>

        {attention && (
          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
            Doctor attention
          </span>
        )}
      </div>

      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
        <p>
          Patient result:{" "}
          <strong>
            {patientValue ??
              "Not reported"}
          </strong>
        </p>

        {previousValue && (
          <p>
            Previous:{" "}
            <strong>
              {previousValue}
            </strong>
          </p>
        )}

        <p>
          Reference:{" "}
          <strong>
            {referenceRange ??
              "Not available"}
          </strong>
        </p>

        {status && (
          <p>
            Status:{" "}
            <strong>
              {status}
            </strong>
          </p>
        )}
      </div>

      {comparison && (
        <p
          className={`mt-2 text-sm font-medium ${
            attention
              ? "text-red-700"
              : "text-clinic-700"
          }`}
        >
          {comparison}
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-clinic-100 bg-canvas p-4">
      <h3 className="font-semibold text-ink">
        {title}
      </h3>

      <div className="mt-3 space-y-2">
        {children}
      </div>
    </section>
  );
}

function KeyValue({
  label,
  value,
}: {
  label: string;
  value?: any;
}) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  return (
    <div className="flex gap-2 text-sm">
      <span className="font-medium">
        {label}:
      </span>

      <span>{String(value)}</span>
    </div>
  );
}

function OriginalDocument({
  document,
  previewUrl,
}: {
  document: {
    originalName: string;
    storedName: string;
    url: string;
  };
  previewUrl?: string;
}) {
  return (
    <section className="mt-5 rounded-xl border border-clinic-100 bg-canvas p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink">
            Original Document
          </h3>

          <p className="text-sm text-muted">
            The original source remains available
            for verification.
          </p>
        </div>

        <a
          href={document.url}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-clinic-600 px-4 py-2 text-sm font-medium text-white"
        >
          Open Original
        </a>
      </div>

      {previewUrl && (
        <img
          src={previewUrl}
          alt="Original medical document"
          className="mt-4 max-h-[600px] w-full rounded-xl border object-contain"
        />
      )}
    </section>
  );
}