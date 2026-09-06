import { Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { usePatientSession } from '../features/patient/state/PatientSessionContext';
export default function PatientComplete(){
 const s=usePatientSession();
 return <div className="min-h-screen bg-canvas"><AppHeader/><main className="mx-auto max-w-2xl px-6 py-16"><div className="rounded-3xl border border-clinic-100 bg-white p-10 text-center shadow-sm">
  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-clinic-50 text-3xl">✓</div>
  <p className="mt-5 text-xs font-bold uppercase tracking-wider text-clinic-600">Intake complete</p>
  <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Your information has been recorded.</h1>
  <p className="mt-4 text-muted">Your history is ready for physician review.</p>
  {s.patientProfile&&<p className="mt-4 text-sm text-muted">Session: {s.patientProfile.identifier}</p>}
  <div className="mt-8 rounded-2xl bg-clinic-50 p-5 text-left"><p className="font-semibold text-clinic-900">What happens next</p><p className="mt-2 text-sm text-clinic-800">A physician can review the structured history, original evidence, previous records, safety flags and timeline before the consultation.</p></div>
  <Link to="/" className="mt-8 inline-block rounded-full border border-clinic-200 px-6 py-3 text-muted">Finish</Link>
 </div></main></div>
}
