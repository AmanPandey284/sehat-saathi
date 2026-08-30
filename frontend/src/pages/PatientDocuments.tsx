import { Link, useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import DocumentUpload from '../features/documents/DocumentUpload';
import { usePatientSession, type BackgroundHistory } from '../features/patient/state/PatientSessionContext';
import { buildTimeline } from '../features/history/recordUtils';
import { useLanguage } from '../i18n/LanguageContext';
import { useState } from 'react';

export default function PatientDocuments(){
 const {language}=useLanguage(); const {chiefComplaint,historyAnswers,safetyFlags,backgroundHistory,setBackgroundHistory,setTimeline,documents}=usePatientSession();
 const nav=useNavigate(); const [saved,setSaved]=useState(false);
 const set=(k:keyof BackgroundHistory,v:string)=>setBackgroundHistory({...backgroundHistory,[k]:v});
 const review=()=>{setTimeline(buildTimeline(chiefComplaint,historyAnswers,documents,backgroundHistory));setSaved(true);setTimeout(()=>nav('/patient/review'),100);};
 return <div className="min-h-screen bg-canvas"><AppHeader/><main className="mx-auto max-w-4xl px-6 py-8">
  <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wide text-clinic-500">{language==='hi'?'चरण 4 · रिकॉर्ड':'Step 4 · Records'}</p><h1 className="mt-2 font-display text-3xl font-semibold text-ink">{language==='hi'?'पिछली जानकारी जोड़ें':'Add previous medical information'}</h1></div>{safetyFlags.length>0&&<span className="rounded-full bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Priority review</span>}</div>
  <section className="mt-6 rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm"><h2 className="font-display text-xl font-semibold text-ink">{language==='hi'?'पिछला चिकित्सा इतिहास':'Background history'}</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{([['pastMedical','Past medical history'],['pastSurgical','Past surgical history'],['medications','Current medicines'],['allergies','Allergies'],['family','Family history'],['personal','Personal / lifestyle history'],['reviewOfSystems','Other symptoms']] as const).map(([key,label])=><label key={key} className="text-sm font-medium text-ink">{label}<textarea rows={3} value={backgroundHistory[key]} onChange={e=>set(key,e.target.value)} className="mt-1 w-full rounded-xl border border-clinic-200 p-3" placeholder="Not reported"/></label>)}</div></section>
  <div className="mt-6"><DocumentUpload/></div>
  {documents.length>0&&<section className="mt-6 rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-clinic-600">Document → structured data</p><div className="mt-4 grid gap-3 sm:grid-cols-4">{['📄 Scanned report','↓ OCR / text extraction','✓ Clinical entities','📋 Timeline + summary'].map(x=><div key={x} className="rounded-xl bg-clinic-50 p-4 text-center text-sm font-medium text-clinic-800">{x}</div>)}</div><div className="mt-5 grid gap-3 md:grid-cols-2">{documents.flatMap(d=>d.entities.slice(0,8).map((e,i)=><div key={`${d.id}-${i}`} className="rounded-lg border border-clinic-100 p-3"><p className="font-medium text-ink">{e.type}: {e.value}</p><p className="text-xs text-muted">Source: {d.name} · {e.confidence}{e.page?` · page ${e.page}`:''}</p></div>))}</div></section>}
  <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><Link to="/patient/history" className="rounded-full border border-clinic-200 px-5 py-3 text-sm text-muted">{language==='hi'?'इतिहास पर वापस':'Back to history'}</Link><div className="flex gap-3"><Link to="/patient/ayush" className="rounded-full border border-clinic-200 px-5 py-3 text-sm text-clinic-700">AYUSH history</Link><button onClick={review} className="rounded-full bg-clinic-600 px-7 py-3 text-lg font-medium text-white">{saved?'Opening review…':'Review & confirm'}</button></div></div>
 </main></div>
}
