import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { BASE_URL } from "../../services/api";

export const DEMO_DOCTOR_CREDENTIALS = {
  username: "demo-doctor",
  password: "demo123",
  displayName: "Dr. Sharma (MD, Clinical Lead)",
  role: "Attending Physician / Clinical Admin",
};

export const AUTH_STORAGE_KEY = "sehatSaathi_doctor_auth_v1";
export const TOKEN_STORAGE_KEY = "sehat_saathi_auth_token";

export interface DoctorUser {
  id?: string;
  username: string;
  displayName: string;
  role: string;
  authenticatedAt: string;
  email?: string;
  doctor_status?: string | null;
  registration_id?: string;
}

interface DoctorAuthContextValue {
  isAuthenticated: boolean;
  user: DoctorUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => { ok: boolean; error?: string } | Promise<{ ok: boolean; error?: string }>;
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
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const loading = false;

  // Sync state to storage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {}
  }, [user]);

  // Validate server session on boot if token exists
  useEffect(() => {
    const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!currentToken) return;

    fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUser((prev) => ({
            ...prev,
            username: prev?.username || "demo-doctor",
            displayName: data.name || prev?.displayName || "Physician",
            role: data.role || prev?.role || "doctor",
            doctor_status: data.doctor_status,
            registration_id: data.registration_id,
            authenticatedAt: prev?.authenticatedAt || new Date().toISOString(),
          }));
        } else if (res.status === 401) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken(null);
        }
      })
      .catch(() => {
        // Offline / dev mode: maintain existing session
      });
  }, []);

  const login = (username: string, password: string): { ok: boolean; error?: string } => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // Check fixed demo credentials
    if (
      (cleanUser === DEMO_DOCTOR_CREDENTIALS.username.toLowerCase() ||
        cleanUser === "demo-doctor@sehat-saathi.com") &&
      cleanPass === DEMO_DOCTOR_CREDENTIALS.password
    ) {
      const newUser: DoctorUser = {
        id: "demo-doctor",
        username: DEMO_DOCTOR_CREDENTIALS.username,
        displayName: DEMO_DOCTOR_CREDENTIALS.displayName,
        role: DEMO_DOCTOR_CREDENTIALS.role,
        authenticatedAt: new Date().toISOString(),
      };
      setUser(newUser);
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      } catch {}

      // Fire async server authentication in background to retrieve JWT token if backend is online
      fetch(`${BASE_URL}/api/auth/doctor/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "demo-doctor@sehat-saathi.com", password: cleanPass }),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data.access_token) {
              localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
              setToken(data.access_token);
            }
          }
        })
        .catch(() => {});

      return { ok: true };
    }

    return {
      ok: false,
      error: "Invalid credentials. Please check your Doctor ID and password.",
    };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  return (
    <DoctorAuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </DoctorAuthContext.Provider>
  );
}

export function useDoctorAuth(): DoctorAuthContextValue {
  const ctx = useContext(DoctorAuthContext);
  if (!ctx) {
    throw new Error("useDoctorAuth must be used within DoctorAuthProvider");
  }
  return ctx;
}
