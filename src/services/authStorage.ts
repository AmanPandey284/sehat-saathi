/**
 * Unified Authentication & Token Storage Service for Sehat Saathi
 */

export const DOCTOR_TOKEN_KEY = "sehat_saathi_doctor_token_v1";
export const PATIENT_TOKEN_KEY = "sehat_saathi_patient_token_v1";
export const GUEST_TOKEN_KEY = "sehat_saathi_guest_token_v1";

// Legacy compatibility keys
export const LEGACY_AUTH_STORAGE_KEY = "sehatSaathi_doctor_auth_v1";
export const LEGACY_TOKEN_STORAGE_KEY = "sehat_saathi_auth_token";

export function getDoctorToken(): string | null {
  return localStorage.getItem(DOCTOR_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY);
}

export function setDoctorToken(token: string): void {
  localStorage.setItem(DOCTOR_TOKEN_KEY, token);
  localStorage.setItem(LEGACY_TOKEN_STORAGE_KEY, token);
}

export function clearDoctorToken(): void {
  localStorage.removeItem(DOCTOR_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
  localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
  sessionStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
}

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
}

/**
 * Returns the effective authorization header for API requests:
 * Prioritizes doctor token if inside physician portal, otherwise patient/guest token.
 */
export function getAuthorizationHeader(preferDoctor: boolean = false): Record<string, string> {
  const token = preferDoctor ? (getDoctorToken() || getPatientToken()) : (getPatientToken() || getDoctorToken());
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
