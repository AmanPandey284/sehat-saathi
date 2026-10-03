import { Route, Routes, Navigate } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { PatientSessionProvider } from './features/patient/state/PatientSessionContext';
import { DoctorAuthProvider } from './features/auth/DoctorAuthContext';
import ProtectedRoute from './features/auth/ProtectedRoute';
import PatientLanding from './pages/PatientLanding';
import AuthLanding from './pages/AuthLanding';
import PatientLogin from './pages/PatientLogin';
import PatientOtp from './pages/PatientOtp';
import ComingSoon from './pages/ComingSoon';
import ConsentScreen from './features/patient/ConsentScreen';
import PatientProfile from './pages/PatientProfile';
import PatientEntryChoice from './pages/PatientEntryChoice';
import PatientHelp from './pages/PatientHelp';
import ExistingPatientPlaceholder from './pages/ExistingPatientPlaceholder';
import ExistingPatientLookup from './pages/ExistingPatientLookup';
import ReturningPatientHome from './pages/ReturningPatientHome';
import ReturningPatientChanges from './pages/ReturningPatientChanges';
import ReturningPatientSafety from './pages/ReturningPatientSafety';
import ReturningPatientOptions from './pages/ReturningPatientOptions';
import ReturningPatientDocuments from './pages/ReturningPatientDocuments';
import ChiefComplaintFlow from './features/patient/ChiefComplaintFlow';
import AdaptiveHistoryFlow from './features/patient/AdaptiveHistoryFlow';
import PatientDocuments from './pages/PatientDocuments';
import PatientReview from './pages/PatientReview';
import PatientComplete from './pages/PatientComplete';
import DoctorDashboard from './features/doctor/DoctorDashboard';
import DoctorLogin from './pages/DoctorLogin';
import DoctorRegister from './pages/DoctorRegister';
import DoctorDirectory from './pages/DoctorDirectory';
import AppointmentBooking from './pages/AppointmentBooking';
import VoiceConsultation from './pages/VoiceConsultation';
import AyushMode from './pages/AyushMode';
import AnalyticsPage from './pages/AnalyticsPage';
import EmergencyScreen from './pages/EmergencyScreen';

export default function App() {
  return (
    <LanguageProvider>
      <PatientSessionProvider>
        <DoctorAuthProvider>
          <Routes>
            {/* Landing & Authentication Choices */}
            <Route path="/" element={<PatientLanding />} />
            <Route path="/auth" element={<AuthLanding />} />
            <Route path="/patient/login" element={<PatientLogin />} />
            <Route path="/patient/verify-otp" element={<PatientOtp />} />

            {/* Patient Workflow */}
            <Route path="/patient/help" element={<PatientHelp />} />
            <Route path="/patient/entry" element={<PatientEntryChoice />} />
            <Route path="/patient/existing" element={<ExistingPatientPlaceholder />} />
            <Route path="/patient/lookup" element={<ExistingPatientLookup />} />
            <Route path="/patient/returning" element={<ReturningPatientHome />} />
            <Route path="/patient/returning/changes" element={<ReturningPatientChanges />} />
            <Route path="/patient/returning/safety" element={<ReturningPatientSafety />} />
            <Route path="/patient/returning/options" element={<ReturningPatientOptions />} />
            <Route path="/patient/returning/documents" element={<ReturningPatientDocuments />} />
            <Route path="/patient/consent" element={<ConsentScreen />} />
            <Route path="/patient/profile" element={<PatientProfile />} />
            <Route path="/patient" element={<ChiefComplaintFlow />} />
            <Route path="/patient/history" element={<AdaptiveHistoryFlow />} />
            <Route path="/patient/documents" element={<PatientDocuments />} />
            <Route path="/patient/voice" element={<VoiceConsultation />} />
            <Route path="/patient/review" element={<PatientReview />} />
            <Route path="/patient/complete" element={<PatientComplete />} />
            <Route path="/patient/ayush" element={<AyushMode />} />
            <Route path="/patient/emergency" element={<EmergencyScreen />} />

            {/* Outpatient Directory & Appointments */}
            <Route path="/doctors" element={<DoctorDirectory />} />
            <Route path="/appointments" element={<AppointmentBooking />} />

            {/* Physician Portal */}
            <Route path="/doctor/login" element={<DoctorLogin />} />
            <Route path="/doctor/register" element={<DoctorRegister />} />
            <Route path="/doctor" element={<ProtectedRoute><DoctorDashboard /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />

            {/* Aliases for direct convenience */}
            <Route path="/profile" element={<Navigate to="/patient/profile" replace />} />
            <Route path="/documents" element={<Navigate to="/patient/documents" replace />} />
            <Route path="/emergency" element={<Navigate to="/patient/emergency" replace />} />
            <Route path="/ayush" element={<Navigate to="/patient/ayush" replace />} />

            {/* Fallback */}
            <Route path="*" element={<ComingSoon label="That page doesn't exist" />} />
          </Routes>
        </DoctorAuthProvider>
      </PatientSessionProvider>
    </LanguageProvider>
  );
}
