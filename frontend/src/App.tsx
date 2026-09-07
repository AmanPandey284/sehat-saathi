import { Route, Routes, useNavigate } from 'react-router-dom';

import { LanguageProvider } from './i18n/LanguageContext';
import { PatientSessionProvider } from './features/patient/state/PatientSessionContext';

import PatientLanding from './pages/PatientLanding';
import ComingSoon from './pages/ComingSoon';
import ConsentScreen from './features/patient/ConsentScreen';
import PatientProfile from './pages/PatientProfile';
import ChiefComplaintFlow from './features/patient/ChiefComplaintFlow';
import AdaptiveHistoryFlow from './features/patient/AdaptiveHistoryFlow';
import PatientDocuments from './pages/PatientDocuments';
import PatientReview from './pages/PatientReview';
import PatientComplete from './pages/PatientComplete';

import DoctorDashboard from './features/doctor/DoctorDashboard';
import DoctorLogin from './features/auth/DoctorLogin';
import ProtectedRoute from './features/auth/ProtectedRoute';

import AyushMode from './pages/AyushMode';
import AnalyticsPage from './pages/AnalyticsPage';
import EmergencyScreen from './pages/EmergencyScreen';


function RoleSelection() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">

      <div className="w-full max-w-md rounded-2xl border border-clinic-100 bg-white p-8 shadow-sm">

        <p className="text-xs font-semibold uppercase tracking-wide text-clinic-500">
          Sehat Saathi
        </p>

        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
          Welcome to Sehat Saathi
        </h1>

        <p className="mt-2 text-sm text-muted">
          Choose how you want to continue.
        </p>

        <div className="mt-8 space-y-4">

          <button
            onClick={() => navigate('/patient')}
            className="w-full rounded-lg bg-clinic-600 px-4 py-3 text-sm font-medium text-white"
          >
            Continue as Patient
          </button>

          <button
            onClick={() => navigate('/doctor/login')}
            className="w-full rounded-lg border border-clinic-200 px-4 py-3 text-sm font-medium text-ink"
          >
            Continue as Doctor
          </button>

        </div>

      </div>

    </div>
  );
}


export default function App() {
  return (
    <LanguageProvider>
      <PatientSessionProvider>

        <Routes>

          {/* Starting page */}
          <Route
            path="/"
            element={<RoleSelection />}
          />

          {/* Patient */}
          <Route
            path="/patient"
            element={<ChiefComplaintFlow />}
          />

          <Route
            path="/patient/consent"
            element={<ConsentScreen />}
          />

          <Route
            path="/patient/profile"
            element={<PatientProfile />}
          />

          <Route
            path="/patient/history"
            element={<AdaptiveHistoryFlow />}
          />

          <Route
            path="/patient/documents"
            element={<PatientDocuments />}
          />

          <Route
            path="/patient/review"
            element={<PatientReview />}
          />

          <Route
            path="/patient/complete"
            element={<PatientComplete />}
          />

          <Route
            path="/patient/ayush"
            element={<AyushMode />}
          />

          <Route
            path="/patient/emergency"
            element={<EmergencyScreen />}
          />

          {/* Doctor Login */}
          <Route
            path="/doctor/login"
            element={<DoctorLogin />}
          />

          {/* Protected Doctor Dashboard */}
          <Route
            path="/doctor"
            element={
              <ProtectedRoute>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Analytics */}
          <Route
            path="/analytics"
            element={<AnalyticsPage />}
          />

          {/* Unknown routes */}
          <Route
            path="*"
            element={
              <ComingSoon label="That page doesn't exist" />
            }
          />

        </Routes>

      </PatientSessionProvider>
    </LanguageProvider>
  );
}