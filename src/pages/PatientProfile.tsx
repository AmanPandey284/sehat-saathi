import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientSession } from '../features/patient/state/PatientSessionContext';

export default function PatientProfile(){
  const nav=useNavigate(); const {language}=useLanguage();
  const {setPatientProfile, consentGranted}=usePatientSession();
  useEffect(()=>{if(!consentGranted)nav('/patient/consent',{replace:true})},[consentGranted,nav]);
  const [name,setName]=useState(''); const [age,setAge]=useState(''); const [sex,setSex]=useState('');
  const [error,setError]=useState('');
  const go=()=>{if(!name.trim()||!age.trim()){setError(language==='hi'?'नाम और उम्र दर्ज करें।':'Please enter name and age.');return;}
    setPatientProfile({name:name.trim(),age:age.trim(),sex,identifier:`DEMO-${Date.now()}`,identifierType:'demo',language});
    nav('/patient');
  };
  return <div className="min-h-screen bg-canvas"><AppHeader/>
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="rounded-2xl border border-clinic-100 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-clinic-500">{language==='hi'?'चरण 1 · रोगी की जानकारी':'Step 1 · Patient details'}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{language==='hi'?'अपनी जानकारी दर्ज करें':'Tell us a little about you'}</h1>
        <div className="mt-6 grid gap-4">
          <label className="text-sm font-medium text-ink">{language==='hi'?'नाम':'Name'}<input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-xl border border-clinic-200 p-3"/></label>
          <label className="text-sm font-medium text-ink">{language==='hi'?'उम्र':'Age'}<input inputMode="numeric" value={age} onChange={e=>setAge(e.target.value)} className="mt-1 w-full rounded-xl border border-clinic-200 p-3"/></label>
          <label className="text-sm font-medium text-ink">{language==='hi'?'लिंग':'Sex'}<select value={sex} onChange={e=>setSex(e.target.value)} className="mt-1 w-full rounded-xl border border-clinic-200 p-3">
            <option value="">{language==='hi'?'बताना नहीं चाहते':'Prefer not to say'}</option><option>{language==='hi'?'महिला':'Female'}</option><option>{language==='hi'?'पुरुष':'Male'}</option><option>{language==='hi'?'अन्य':'Other'}</option>
          </select></label>
        </div>
        {error&&<p role="alert" className="mt-3 text-sm text-flag-700">{error}</p>}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button onClick={()=>nav('/patient/consent')} className="rounded-full border border-clinic-200 px-7 py-3 text-lg text-muted">{language==='hi'?'वापस':'Back'}</button>
          <button onClick={go} className="rounded-full bg-clinic-600 px-7 py-3 text-lg font-medium text-white">{language==='hi'?'आगे बढ़ें':'Continue'}</button>
        </div>
      </div>
    </main>
  </div>
}
