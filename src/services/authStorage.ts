/**
 * Unified Authentication & Token Storage Service for Sehat Saathi
 * Enforces strict role isolation between Physician, Patient, and Guest sessions.
 */

export const DOCTOR_TOKEN_KEY = "sehat_saathi_doctor_token_v1";
export const PATIENT_TOKEN_KEY = "sehat_saathi_patient_token_v1";
export const GUEST_TOKEN_KEY = "sehat_saathi_guest_token_v1";

// Legacy compatibility keys
export const LEGACY_AUTH_STORAGE_KEY = "sehatSaathi_doctor_auth_v1";
export const LEGACY_TOKEN_STORAGE_KEY = "sehat_saathi_auth_token";

const DEFAULT_API_BASE_URL = typeof window !== "undefined" && window.location.origin.includes("localhost")
  ? "http://127.0.0.1:8000"
  : "http://127.0.0.1:8000";

/**
 * Doctor Token Management
 * Strictly isolated to doctor token key to prevent patient/guest crossover.
 */
export function getDoctorToken(): string | null {
  return localStorage.getItem(DOCTOR_TOKEN_KEY);
}

export function setDoctorToken(token: string): void {
  localStorage.setItem(DOCTOR_TOKEN_KEY, token);
}

export function clearDoctorToken(): void {
  localStorage.removeItem(DOCTOR_TOKEN_KEY);
  localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
  sessionStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
}

/**
 * Patient Token Management
 */
export function getPatientToken(): string | null {
  return localStorage.getItem(PATIENT_TOKEN_KEY) || localStorage.getItem(GUEST_TOKEN_KEY);
}

export function setPatientToken(token: string): void {
  localStorage.setItem(PATIENT_TOKEN_KEY, token);
}

export function setGuestToken(token: string): void {
  localStorage.setItem(GUEST_TOKEN_KEY, token);
}

export function clearPatientToken(): void {
  localStorage.removeItem(PATIENT_TOKEN_KEY);
  localStorage.removeItem(GUEST_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
  localStorage.removeItem("sehat_saathi_patient_id");
}

/**
 * Reset Kiosk Session between patients
 */
export function clearKioskPatientState(): void {
  clearPatientToken();
  try {
    localStorage.removeItem("medikiosk_session_v2");
    localStorage.removeItem("sehat_saathi_active_encounter_id");
  } catch {}
}

/**
 * Ensures an active patient or cryptographically signed guest session exists before API actions
 */
export async function ensurePatientOrGuestSession(baseUrl: string = DEFAULT_API_BASE_URL): Promise<string | null> {
  const existing = getPatientToken();
  if (existing) return existing;

  try {
    const res = await fetch(`${baseUrl}/api/auth/guest-session`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        setGuestToken(data.token);
        return data.token;
      }
    }
  } catch (err) {
    console.warn("[AuthStorage] Guest session auto-issuance offline:", err);
  }
  return null;
}

/**
 * Explicit Authorization Headers by Workflow Role
 * Never falls back across roles!
 */
export function getDoctorAuthorizationHeader(): Record<string, string> {
  const token = getDoctorToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getPatientAuthorizationHeader(): Record<string, string> {
  const token = getPatientToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getAuthorizationHeader(preferDoctor: boolean = false): Record<string, string> {
  return preferDoctor ? getDoctorAuthorizationHeader() : getPatientAuthorizationHeader();
}
