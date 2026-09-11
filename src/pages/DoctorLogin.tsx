import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { DEMO_DOCTOR_CREDENTIALS, useDoctorAuth } from "../features/auth/DoctorAuthContext";

export default function DoctorLogin() {
  const { login } = useDoctorAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const from = (location.state as any)?.from?.pathname || "/doctor";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter both Doctor ID and password.");
      return;
    }

    setBusy(true);
    const result = login(username, password);
    setBusy(false);

    if (result.ok) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || "Login failed. Please check your credentials.");
    }
  };

  const handleQuickFill = () => {
    setUsername(DEMO_DOCTOR_CREDENTIALS.username);
    setPassword(DEMO_DOCTOR_CREDENTIALS.password);
    setError("");
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader />
        <main className="mx-auto max-w-md px-6 py-12">
          <div className="rounded-3xl border border-clinic-100 bg-white/95 p-8 shadow-sm sm:p-10 glass-card">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-clinic-50 text-2xl border border-clinic-100" aria-hidden>
                🩺
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-clinic-600">
                  Staff Authentication
                </p>
                <h1 className="font-display text-2xl font-semibold text-ink">
                  Physician Portal
                </h1>
              </div>
            </div>

            <p className="mt-3 text-sm text-muted leading-relaxed">
              Secure clinician access for triage audit, queue management, and FHIR export.
            </p>

            {/* DEMO CREDENTIALS CALLOUT BOX */}
            <div className="mt-6 rounded-2xl border border-clinic-200 bg-clinic-50/70 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-clinic-700">
                  Demo Credentials
                </span>
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-clinic-700 border border-clinic-200 hover:bg-clinic-100 transition shadow-2xs"
                >
                  Auto-fill Demo
                </button>
              </div>
              <div className="mt-2 space-y-1 font-mono text-xs text-ink">
                <p>
                  <strong className="font-sans text-muted">ID:</strong> {DEMO_DOCTOR_CREDENTIALS.username}
                </p>
                <p>
                  <strong className="font-sans text-muted">Password:</strong> {DEMO_DOCTOR_CREDENTIALS.password}
                </p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="doctor-id" className="block text-xs font-bold uppercase tracking-wider text-muted">
                  Doctor ID
                </label>
                <input
                  id="doctor-id"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. demo-doctor"
                  className="mt-1 w-full rounded-xl border border-clinic-200 px-4 py-3 text-sm text-ink focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-100 transition"
                />
              </div>

              <div>
                <label htmlFor="doctor-password" className="block text-xs font-bold uppercase tracking-wider text-muted">
                  Password
                </label>
                <input
                  id="doctor-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border border-clinic-200 px-4 py-3 text-sm text-ink focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-100 transition"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="mt-2 w-full rounded-full bg-clinic-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-clinic-700 disabled:opacity-50"
              >
                {busy ? "Signing in…" : "Sign in to Dashboard →"}
              </button>
            </form>

            <div className="mt-8 border-t border-clinic-100 pt-6 text-center">
              <Link
                to="/"
                className="text-xs font-medium text-muted hover:text-ink transition"
              >
                ← Return to Patient Landing Page
              </Link>
            </div>
          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · Staff Authentication
      </footer>
    </div>
  );
}
