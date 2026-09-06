import { Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientSession } from '../features/patient/state/PatientSessionContext';

export default function EmergencyScreen(){
 const {language}=useLanguage(); const {safetyFlags}=usePatientSession();
 return <div className="min-h-screen bg-canvas"><AppHeader/><main className="mx-auto max-w-2xl px-6 py-12">
  <div className="rounded-3xl border-2 border-red-200 bg-red-50 p-8 shadow-sm sm:p-10">
   <div className="text-5xl" aria-hidden>🚨</div>
   <p className="mt-4 text-sm font-bold uppercase tracking-wider text-red-700">{language==='hi'?'तत्काल जांच आवश्यक':'Potential Emergency Detected'}</p>
   <h1 className="mt-2 font-display text-3xl font-semibold text-red-950">{language==='hi'?'तुरंत ट्रायेज की सलाह':'Immediate triage recommended'}</h1>
   <p className="mt-4 text-red-900">{language==='hi'?'आपके बताए लक्षणों के कारण नियमित इतिहास जारी नहीं रखा जाएगा। कृपया तुरंत अस्पताल के ट्रायेज/क्लिनिकल स्टाफ से संपर्क करें।':'A potentially urgent symptom combination was detected. Routine history has been stopped so you can seek prompt clinical assessment.'}</p>
   <div className="mt-6 space-y-3">{safetyFlags.map(f=><div key={f.id} className="rounded-xl bg-white p-4"><p className="font-semibold text-red-900">{f.title}</p><p className="mt-1 text-sm text-red-800">{f.explanation}</p></div>)}</div>
   <Link to="/" className="mt-8 inline-block rounded-full bg-red-700 px-7 py-3 font-medium text-white">{language==='hi'?'मुख्य पृष्ठ':'Return to start'}</Link>
  </div>
 </main></div>
}
