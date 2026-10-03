import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../services/api";

export default function PatientLogin() {
  const navigate = useNavigate();

  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const clean = recipient.trim();
    if (clean.length < 3) {
      setErrorMsg("Please enter a valid mobile number or email address.");
      return;
    }

    try {
      setLoading(true);
      const isEmail = clean.includes("@");
      const payload = {
        recipient: clean,
        channel: isEmail ? "email" : "email", // Backend email adapter with simulated dev fallback
        purpose: "login",
      };

      const res = await fetch(`${BASE_URL}/api/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.detail || "Unable to send verification code.");
        return;
      }

      navigate("/patient/verify-otp", {
        state: {
          recipient: clean,
          challengeId: data.challenge_id,
          devCode: data.dev_code,
          deliveryMode: data.delivery_mode,
          expiresIn: data.expires_in_seconds,
        },
      });
    } catch (err: any) {
      setErrorMsg("Connection to server failed. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Back navigation */}
        <button
          onClick={() => navigate("/auth")}
          className="mb-6 inline-flex items-center text-xs font-semibold text-slate-500 hover:text-teal-700 transition"
        >
          <span className="mr-1.5 text-sm">←</span> Back to Options
        </button>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-teal-100 shadow-xl shadow-teal-100/30 p-7 md:p-8">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-5 text-xl font-bold">
            👤
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Authentication</h1>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Enter your mobile number or email address. We will transmit a secure, one-time verification code.
          </p>

          {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mobile Number or Email
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. 9876543210 or patient@example.com"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                In local development mode, simulated test codes are provided automatically.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-teal-600/20 disabled:opacity-50 transition"
            >
              {loading ? "Sending One-Time Code..." : "Send Verification Code"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <button
              onClick={() => navigate("/patient/entry")}
              className="text-xs text-slate-500 hover:text-teal-600 font-medium"
            >
              Prefer guest demo without login? <span className="underline font-semibold">Start Guest Intake</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
