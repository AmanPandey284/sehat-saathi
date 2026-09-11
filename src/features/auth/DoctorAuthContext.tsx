import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const DEMO_DOCTOR_CREDENTIALS = {
  username: "demo-doctor",
  password: "demo123",
  displayName: "Dr. Sharma (Demo Physician)",
  role: "Attending Physician / Clinical Admin",
};

export const AUTH_STORAGE_KEY = "sehatSaathi_doctor_auth_v1";

export interface DoctorUser {
  username: string;
  displayName: string;
  role: string;
  authenticatedAt: string;
}

interface DoctorAuthContextValue {
  isAuthenticated: boolean;
  user: DoctorUser | null;
  login: (username: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
}

const DoctorAuthContext = createContext<DoctorAuthContextValue | null>(null);

function loadAuth(): DoctorUser | null {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function DoctorAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DoctorUser | null>(loadAuth);

  useEffect(() => {
    try {
      if (user) {
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } else {
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {}
  }, [user]);

  const login = (username: string, password: string) => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (
      cleanUser === DEMO_DOCTOR_CREDENTIALS.username.toLowerCase() &&
      cleanPass === DEMO_DOCTOR_CREDENTIALS.password
    ) {
      const newUser: DoctorUser = {
        username: DEMO_DOCTOR_CREDENTIALS.username,
        displayName: DEMO_DOCTOR_CREDENTIALS.displayName,
        role: DEMO_DOCTOR_CREDENTIALS.role,
        authenticatedAt: new Date().toISOString(),
      };
      setUser(newUser);
      try {
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      } catch {}
      return { ok: true };
    }

    return {
      ok: false,
      error: "Invalid credentials. Please use the demo credentials provided below.",
    };
  };

  const logout = () => {
    setUser(null);
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {}
  };

  return (
    <DoctorAuthContext.Provider
      value={{
        isAuthenticated: user !== null,
        user,
        login,
        logout,
      }}
    >
      {children}
    </DoctorAuthContext.Provider>
  );
}

export function useDoctorAuth() {
  const context = useContext(DoctorAuthContext);
  if (!context) {
    throw new Error("useDoctorAuth must be used within DoctorAuthProvider");
  }
  return context;
}
