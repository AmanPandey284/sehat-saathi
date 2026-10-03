import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BASE_URL } from "../services/api";

export default function PatientOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state as {
    recipient?: string;
    challengeId?: string;
    devCode?: string;
    deliveryMode?: string;
    expiresIn?: number;
  }) || {};

  const [code, setCode] = useState(state.devCode || "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timer, setTimer] = useState(state.expiresIn || 300);

  useEffect(() => {
    if (!state.challengeId || !state.recipient) {
      navigate("/patient/login");
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [state, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (code.trim().length !== 6) {
      setErrorMsg("Please enter the 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: state.challengeId,
          recipient: state.recipient,
          code: code.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || "Invalid verification code.");
        return;
      }

      // Save token to localStorage
      if (data.session_token) {
        localStorage.setItem("sehat_saathi_auth_token", data.session_token);
        localStorage.setItem("sehat_saathi_patient_id", state.recipient || "patient");
      }

      // Navigate to patient entry choice
      navigate("/patient/entry");
    } catch (err: any) {
      setErrorMsg("Verification request failed. Server might be offline.");
    } finally {
      setLoading(false);
    }
  };

  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Back navigation */}
        <button
          onClick={() => navigate("/patient/login")}
          className="mb-6 inline-flex items-center text-xs font-semibold text-slate-500 hover:text-teal-700 transition"
        >
          <span className="mr-1.5 text-sm">←</span> Re-enter Contact
        </button>

        <div className="bg-white rounded-3xl border border-teal-100 shadow-xl shadow-teal-100/30 p-7 md:p-8">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-5 text-xl font-bold">
            🔑
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Enter Verification Code</h1>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            A one-time code was dispatched to <strong className="text-slate-700">{state.recipient}</strong>.
          </p>

          {/* Dev Simulation Notice */}
          {state.devCode && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
                <span>⚡ Dev Simulation Code:</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300 text-teal-800">
                  {state.devCode}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-amber-700">
                Non-production environment active. Real SMS charges bypassed.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleVerify} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                6-Digit Security Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                required
                className="w-full text-center tracking-[8px] text-xl font-bold font-mono px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Time Remaining:</span>
              <span className="font-semibold text-teal-700 font-mono">
                {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || timer === 0}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-teal-600/20 disabled:opacity-50 transition"
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
