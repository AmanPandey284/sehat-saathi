import type { AnswerValue } from '../patient/engine/types';
import type { ChiefComplaintRecord, ClinicalDocument, BackgroundHistory, PatientProfile, DoctorReview, SafetyFlag } from '../patient/state/PatientSessionContext';
import { labelField, valueText } from './recordUtils';

export function generateClinicalSummary(
  complaint: ChiefComplaintRecord | null,
  answers: Record<string, AnswerValue> | null,
  documents: ClinicalDocument[],
  background?: BackgroundHistory,
  profile?: PatientProfile | null,
  flags: SafetyFlag[] = [],
  reviews: DoctorReview[] = [],
  longitudinalChanges?: import('../patient/returningPatientModel').LongitudinalChanges
): string {
  const out: string[] = [];
  out.push('PHYSICIAN-READY CLINICAL INTAKE');
  out.push('');
  if (profile) out.push(`Patient: ${profile.name || 'Anonymous'} | Age: ${profile.age || 'Not reported'} | Sex: ${profile.sex || 'Not reported'}`);
  out.push(`Chief complaint: ${complaint?.displayName ?? 'Not reported'}`);
  if (complaint?.originalInput) out.push(`Patient wording: ${complaint.originalInput}`);
  out.push('', 'History of present illness:');
  const clinicalEntries = answers
    ? Object.entries(answers).filter(([field]) => !field.startsWith('returning_') && !field.startsWith('safety_screened'))
    : [];
  if (clinicalEntries.length) {
    for (const [field, v] of clinicalEntries) {
      const r = reviews.find((x) => x.field === field);
      out.push(`• ${labelField(field)}: ${r?.status === 'edited' ? r.editedValue : valueText(v)} [source: patient; ${r?.status ?? 'unverified'}]`);
    }
  } else {
    out.push('• Not reported');
  }
  if (background) {
    out.push('', 'Background history:');
    for (const [field, v] of Object.entries(background)) {
      out.push(`• ${labelField(field)}: ${v || 'Not reported'}`);
    }
  }
  if (documents.length) {
    const docNames = Array.from(new Set(documents.map((d) => d.name).filter(Boolean))).join(', ');
    out.push('', `Prior records (Source: ${docNames || 'Uploaded documents'}):`);
    for (const doc of documents) {
      for (const e of doc.entities) {
        out.push(`• ${e.type}: ${e.value}`);
      }
    }
  }
  if (answers && answers.returning_visit_reason) {
    out.push('', 'Longitudinal visit delta:');
    out.push(`• Visit category: ${String(answers.returning_visit_reason)}`);
    if (answers.returning_followup_status && answers.returning_followup_status !== 'not_applicable') {
      out.push(`• Follow-up status: ${String(answers.returning_followup_status)}`);
    }
    if (longitudinalChanges?.previousSafetyFlags && longitudinalChanges.previousSafetyFlags.length > 0) {
      out.push(`• Prior consultation safety alert (historical): ${longitudinalChanges.previousSafetyFlags.map(f => `${f.title} [${f.severity.toUpperCase()}]`).join(', ')}`);
    }
  }
  if (flags.length) {
    out.push('', 'Safety flags:');
    for (const f of flags) {
      out.push(`• ${f.severity.toUpperCase()}: ${f.title} — ${f.explanation}`);
    }
  } else {
    out.push('', 'Safety flags: None configured for this session.');
  }
  out.push('', 'Clinical safety note: Draft for physician review. Not a diagnosis or treatment recommendation.');
  return out.join('\n');
}
