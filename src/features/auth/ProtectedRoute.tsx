import { Navigate, useLocation } from "react-router-dom";
import { useDoctorAuth } from "./DoctorAuthContext";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useDoctorAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/doctor/login" state={{ from: location }} replace />;
  }

  return children;
}
