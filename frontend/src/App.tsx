
import DoctorLogin from "./pages/DoctorLogin";
import { Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { PatientSessionProvider } from './features/patient/state/PatientSessionContext';

import PatientOtp from './pages/PatientOtp';
import AuthLanding from './pages/AuthLanding';
import PatientLogin from './pages/PatientLogin';
import ComingSoon from './pages/ComingSoon';
import ConsentScreen from './features/patient/ConsentScreen';
import PatientProfile from './pages/PatientProfile';
import ChiefComplaintFlow from './features/patient/ChiefComplaintFlow';
import AdaptiveHistoryFlow from './features/patient/AdaptiveHistoryFlow';
import PatientDocuments from './pages/PatientDocuments';
import PatientReview from './pages/PatientReview';
import PatientComplete from './pages/PatientComplete';
import DoctorDashboard from './features/doctor/DoctorDashboard';
import AyushMode from './pages/AyushMode';
import AnalyticsPage from './pages/AnalyticsPage';
import EmergencyScreen from './pages/EmergencyScreen';

export default function App(){
  return <LanguageProvider><PatientSessionProvider><Routes>
    <Route path="/" element={<AuthLanding />} />
    <Route path="/patient/login" element={<PatientLogin />} />
    <Route path="/patient/verify-otp" element={<PatientOtp />} />
    <Route path="/patient/consent" element={<ConsentScreen/>}/>
    <Route path="/patient/profile" element={<PatientProfile/>}/>
    <Route path="/patient" element={<ChiefComplaintFlow/>}/>
    <Route path="/patient/history" element={<AdaptiveHistoryFlow/>}/>
    <Route path="/patient/documents" element={<PatientDocuments/>}/>
    <Route path="/patient/review" element={<PatientReview/>}/><Route path="/patient/complete" element={<PatientComplete/>}/>
    <Route path="/patient/ayush" element={<AyushMode/>}/>
    <Route path="/patient/emergency" element={<EmergencyScreen/>}/>
    <Route path="/doctor" element={<DoctorDashboard/>}/>
    <Route path="/analytics" element={<AnalyticsPage/>}/>
    <Route path="/doctor/login" element={<DoctorLogin />} />
    <Route path="*" element={<ComingSoon label="That page doesn't exist"/>}/>
  </Routes></PatientSessionProvider></LanguageProvider>
}
