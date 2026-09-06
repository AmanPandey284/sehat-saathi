import type { AnswerValue } from '../patient/engine/types';
import type { ChiefComplaintRecord, ClinicalDocument, TimelineEvent, BackgroundHistory } from '../patient/state/PatientSessionContext';
export function labelField(field:string){ return field.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase()).replace(/_/g,' '); }
export function valueText(v: AnswerValue|undefined|null){ return Array.isArray(v) ? v.join(', ') : String(v ?? 'Not reported'); }
export function buildTimeline(complaint:ChiefComplaintRecord|null,answers:Record<string,AnswerValue>|null,documents:ClinicalDocument[],background?:BackgroundHistory):TimelineEvent[]{
 const now=new Date().toISOString(); const events:TimelineEvent[]=[];
 if(complaint) events.push({id:'complaint',date:now,title:'Chief complaint recorded',detail:complaint.displayName,source:'PATIENT'});
 if(answers) for(const [field,value] of Object.entries(answers)) if(value!==null&&value!=='') events.push({id:`answer-${field}`,date:now,title:labelField(field),detail:valueText(value),source:'PATIENT'});
 if(background) for(const [field,value] of Object.entries(background)) if(value) events.push({id:`background-${field}`,date:now,title:labelField(field),detail:value,source:'PATIENT'});
 for(const doc of documents) events.push({id:doc.id,date:doc.uploadedAt,title:doc.name,detail:`${doc.entities.length} extracted clinical item(s)`,source:'DOCUMENT'});
 return events.sort((a,b)=>b.date.localeCompare(a.date));
}
