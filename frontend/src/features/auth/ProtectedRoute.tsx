import { Navigate } from 'react-router-dom';

import { useAuth } from './AuthContext';

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    user,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted">
          Checking access...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/doctor/login"
        replace
      />
    );
  }

  if (
    user.role !== 'doctor' ||
    user.doctor_status !== 'approved'
  ) {
    return (
      <Navigate
        to="/doctor/login"
        replace
      />
    );
  }

  return children;
}