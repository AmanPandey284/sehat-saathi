import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export default function PatientOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  const mobile = location.state?.mobile || "";
  const demoOtp = location.state?.demoOtp || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      alert("Please enter a valid 6-digit OTP");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/auth/patient/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mobile,
            otp,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Invalid OTP");
        return;
      }

      localStorage.setItem(
        "patient_access_token",
        data.access_token
      );

      navigate("/patient/consent");
    } catch (error) {
      console.error(error);
      alert("Unable to connect to the backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center px-5 py-10">

      <div className="w-full max-w-md">

        {/* Back */}
        <button
          onClick={() => navigate("/patient/login")}
          className="mb-6 inline-flex items-center text-sm font-medium text-slate-500 hover:text-teal-600 transition"
        >
          <span className="mr-2">←</span>
          Back
        </button>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-teal-100 shadow-xl shadow-teal-100/40 p-7 md:p-9">

          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-6">
            <span className="text-2xl">🔐</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Verify Mobile
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Enter the 6-digit verification code sent to your mobile
            number.
          </p>

          {/* Mobile number */}
          <div className="mt-5 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-400">
              Mobile number
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-700">
              +91 {mobile}
            </p>
          </div>

          <form onSubmit={handleVerify} className="mt-7">

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Verification Code
            </label>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) =>
                setOtp(
                  e.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              className="w-full px-4 py-4 rounded-xl border border-slate-200 text-center text-xl tracking-[0.4em] font-semibold text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-teal-200 hover:shadow-teal-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>

          </form>

          {/* Demo OTP */}
          {demoOtp && (
            <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4">

              <div className="flex items-start gap-3">
                <span className="text-lg">🧪</span>

                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">
                    Demo Mode
                  </p>

                  <p className="mt-1 text-xs text-amber-700">
                    SMS delivery is disabled for this prototype.
                  </p>

                  <div className="mt-3 bg-white rounded-xl border border-amber-200 px-4 py-3 text-center">
                    <p className="text-xs text-amber-600">
                      Demo OTP
                    </p>

                    <p className="mt-1 text-2xl font-bold tracking-[0.35em] text-amber-800">
                      {demoOtp}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-400">
          Sehat Saathi • Secure healthcare access
        </div>

      </div>
    </div>
  );
}