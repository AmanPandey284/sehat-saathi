import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientSession } from '../features/patient/state/PatientSessionContext';
import { labelField, valueText } from '../features/history/recordUtils';

const backgroundLabels:Record<string,string>={pastMedical:'Past medical history',pastSurgical:'Past surgical history',medications:'Current medicines',allergies:'Allergies',family:'Family history',personal:'Personal / lifestyle history',reviewOfSystems:'Other symptoms'};

export default function PatientReview(){
 const {language}=useLanguage(); const nav=useNavigate();
 const s=usePatientSession(); const [edits,setEdits]=useState<Record<string,string>>({});
 const answers=s.historyAnswers??{}; const all=useMemo(()=>Object.entries(answers),[answers]);
 const updateBg=(key:string,value:string)=>s.setBackgroundHistory({...s.backgroundHistory,[key as keyof typeof s.backgroundHistory]:value});
 const confirm=()=>nav('/patient/complete');
 return <div className="min-h-screen bg-canvas"><AppHeader/><main className="mx-auto max-w-4xl px-6 py-8">
  <p className="text-sm font-semibold uppercase tracking-wide text-clinic-500">{language==='hi'?'चरण 5 · पुष्टि':'Step 5 · Review'}</p>
  <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{language==='hi'?'अपनी जानकारी जांचें':'Review your information'}</h1>
  <p className="mt-2 text-muted">{language==='hi'?'सबमिट करने से पहले आप कोई भी जानकारी बदल सकते हैं।':'Check your answers before submitting. You can correct anything that is not right.'}</p>
  {s.safetyFlags.length>0&&<div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5"><p className="font-semibold text-red-900">🚨 Priority clinical review</p>{s.safetyFlags.map(f=><p key={f.id} className="mt-1 text-sm text-red-800">{f.title}: {f.explanation}</p>)}</div>}
  <section className="mt-6 rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm"><h2 className="font-display text-xl font-semibold">Structured history</h2><div className="mt-4 divide-y divide-clinic-50">{all.map(([field,value])=><div key={field} className="grid gap-3 py-4 sm:grid-cols-[1fr_1.4fr]"><div><p className="text-xs uppercase tracking-wide text-muted">{labelField(field)}</p><p className="mt-1 text-sm text-muted">Source: PATIENT</p></div><div><input value={edits[field]??valueText(value)} onChange={e=>setEdits({...edits,[field]:e.target.value})} className="w-full rounded-xl border border-clinic-200 p-3"/>{edits[field]!==undefined&&<button onClick={()=>{
 const corrected=edits[field];
 s.setHistoryAnswers({...answers,[field]:corrected});
 const existing=s.evidence.find(e=>e.field===field);
 const updated={field,originalAnswer:existing?.originalAnswer??String(value??''),normalizedValue:corrected,source:'PATIENT' as const,language:existing?.language??language,timestamp:new Date().toISOString(),confidence:existing?.confidence??'medium' as const};
 s.setEvidence([...s.evidence.filter(e=>e.field!==field),updated]);
 setEdits({...edits});
}} className="mt-2 rounded-full border border-clinic-200 px-3 py-1 text-xs text-clinic-700">Save correction</button>}</div></div>)}</div></section>
  <section className="mt-6 rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm"><h2 className="font-display text-xl font-semibold">Background history</h2>{Object.entries(backgroundLabels).map(([key,label])=><label key={key} className="mt-4 block text-sm font-medium">{label}<textarea rows={2} value={s.backgroundHistory[key as keyof typeof s.backgroundHistory]} onChange={e=>updateBg(key,e.target.value)} className="mt-1 w-full rounded-xl border border-clinic-200 p-3" placeholder="Not reported"/></label>)}</section>
  {s.documents.length>0&&<section className="mt-6 rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm"><h2 className="font-display text-xl font-semibold">Previous records</h2>{s.documents.map(d=><div key={d.id} className="mt-4 rounded-xl bg-canvas p-4"><p className="font-medium">{d.name}</p><div className="mt-3 flex flex-wrap gap-2">{d.entities.slice(0,10).map((e,i)=><span key={i} className="rounded-full bg-white px-3 py-1 text-xs text-clinic-800">{e.type}: {e.value}</span>)}</div></div>)}</section>}
  <div className="mt-7 flex justify-between gap-3"><Link to="/patient/documents" className="rounded-full border border-clinic-200 px-6 py-3 text-muted">Back</Link><button onClick={confirm} className="rounded-full bg-clinic-600 px-7 py-3 text-lg font-medium text-white">Confirm & submit</button></div>
 </main></div>
}
