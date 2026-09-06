import type { AnswerValue } from '../patient/engine/types';
import type { ChiefComplaintRecord, ClinicalDocument, BackgroundHistory, PatientProfile, DoctorReview, SafetyFlag } from '../patient/state/PatientSessionContext';
import { labelField, valueText } from './recordUtils';
export function generateClinicalSummary(complaint:ChiefComplaintRecord|null,answers:Record<string,AnswerValue>|null,documents:ClinicalDocument[],background?:BackgroundHistory,profile?:PatientProfile|null,flags:SafetyFlag[]=[] ,reviews:DoctorReview[]=[]):string{
 const out:string[]=[]; out.push('PHYSICIAN-READY CLINICAL INTAKE'); out.push('');
 if(profile) out.push(`Patient: ${profile.name||'Anonymous'} | Age: ${profile.age||'Not reported'} | Sex: ${profile.sex||'Not reported'}`);
 out.push(`Chief complaint: ${complaint?.displayName??'Not reported'}`); if(complaint?.originalInput) out.push(`Patient wording: ${complaint.originalInput}`);
 out.push('','History of present illness:');
 if(answers && Object.keys(answers).length) for(const [field,v] of Object.entries(answers)){ const r=reviews.find(x=>x.field===field); out.push(`• ${labelField(field)}: ${r?.status==='edited'?r.editedValue:valueText(v)} [source: patient; ${r?.status??'unverified'}]`); } else out.push('• Not reported');
 if(background){ out.push('','Background history:'); for(const [field,v] of Object.entries(background)) out.push(`• ${labelField(field)}: ${v||'Not reported'}`); }
 if(documents.length){ out.push('','Prior records:'); for(const doc of documents) for(const e of doc.entities) out.push(`• ${e.type}: ${e.value} [${e.confidence}; source: ${doc.name}]`); }
 if(flags.length){ out.push('','Safety flags:'); for(const f of flags) out.push(`• ${f.severity.toUpperCase()}: ${f.title} — ${f.explanation}`); } else out.push('','Safety flags: None configured for this session.');
 out.push('','Clinical safety note: Draft for physician review. Not a diagnosis or treatment recommendation.');
 return out.join('\n');
}
