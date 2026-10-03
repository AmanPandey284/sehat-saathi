import { Navigate, useLocation } from "react-router-dom";
import { useDoctorAuth } from "./DoctorAuthContext";
import { getDoctorToken } from "../../services/authStorage";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, user, loading } = useDoctorAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-clinic-600 border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500">Verifying clinical credentials...</p>
        </div>
      </div>
    );
  }

  const hasToken = !!getDoctorToken();
  const isPhysicianOrAdmin =
    user &&
    (user.role === "doctor" || user.role === "admin") &&
    (user.role === "admin" || user.doctor_status === "approved");

  if (!isAuthenticated || !hasToken || !isPhysicianOrAdmin) {
    return <Navigate to="/doctor/login" state={{ from: location }} replace />;
  }

  return children;
}
