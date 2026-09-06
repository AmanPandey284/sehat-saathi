import type { AnswerValue } from '../patient/engine/types';
import type { SafetyFlag } from '../patient/state/PatientSessionContext';

const flag=(id:string,severity:'urgent'|'attention',title:string,explanation:string,field:string):SafetyFlag=>({id,severity,title,explanation,field,triggeredAt:new Date().toISOString()});
export function evaluateSafety(answers:Record<string,AnswerValue>):SafetyFlag[]{
  const flags:SafetyFlag[]=[];
  const yes=(k:string)=>answers[k]==='yes'||answers[k]===true;
  const severe=typeof answers.severity==='number'&&answers.severity>=8;
  const chest=answers.chestPain==='yes'||answers.chestPain===true;
  if(yes('breathingDifficulty')||yes('breathlessness')){
    flags.push(flag('breathing-difficulty','urgent','Breathing difficulty reported','Potential emergency symptom: immediate clinical triage is recommended.','breathingDifficulty'));
  }
  if(chest&&severe){
    flags.push(flag('severe-chest-pain','urgent','Severe chest pain reported','Severe chest pain together with the recorded symptoms requires immediate clinical triage.','chestPain'));
  }
  if(yes('bloodInCough')){
    flags.push(flag('blood-in-cough','urgent','Blood reported with cough','Blood in cough requires prompt clinical assessment.','bloodInCough'));
  }
  if(yes('bloodInStool')||answers.bowelChange==='blood_in_stool'||answers.bowelChange==='black_tarry_stool'||answers.bowelChanges==='blood_in_stool'||answers.bowelChanges==='black_tarry_stool'){
    flags.push(flag('gi-bleeding','urgent','Possible gastrointestinal bleeding','Blood or black/tarry stool was reported. Prompt clinical assessment is required.','bowelChange'));
  }
  if(severe){
    flags.push(flag('severe-pain','attention','Severe pain reported','Pain severity was recorded as 8/10 or higher and should be reviewed by the clinician.','severity'));
  }
  if(yes('vomiting')&&(answers.keepingFluidsDown==='no'||answers.keepingFluidsDown===false)&&severe){
    flags.push(flag('dehydration-risk','urgent','Unable to keep fluids down with severe symptoms','This combination requires prompt clinical assessment.','keepingFluidsDown'));
  }
  return flags;
}
export function detectUrgentComplaintText(text:string):SafetyFlag|null{
  const x=text.toLowerCase();
  const chest=/(seene|सीने|chest).{0,35}(tez|बहुत|severe|severe|dard|दर्द|pain)/u.test(x);
  const breath=/(saans|सांस|breath|breathing|दम).{0,35}(dikkat|तकलीफ|problem|difficulty|phool|फूल)/u.test(x);
  if(chest&&breath) return flag('urgent-chief-complaint','urgent','Potential Emergency Detected','Severe chest pain with breathing difficulty was reported. Immediate triage is recommended.','chiefComplaint');
  return null;
}
