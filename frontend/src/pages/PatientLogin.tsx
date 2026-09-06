import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export default function PatientLogin() {
  const navigate = useNavigate();

  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mobile.length !== 10) {
      alert("Please enter a valid 10-digit mobile number");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/auth/patient/send-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mobile,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Failed to send OTP");
        return;
      }

      navigate("/patient/verify-otp", {
        state: {
          mobile,
          demoOtp: data.demo_otp,
        },
      });
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
          onClick={() => navigate("/")}
          className="mb-6 inline-flex items-center text-sm font-medium text-slate-500 hover:text-teal-600 transition"
        >
          <span className="mr-2">←</span>
          Back
        </button>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-teal-100 shadow-xl shadow-teal-100/40 p-7 md:p-9">

          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-6">
            <span className="text-2xl">👤</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Patient Login
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Enter your mobile number and we'll send you a one-time
            verification code.
          </p>

          <form onSubmit={handleContinue} className="mt-8">

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Mobile Number
            </label>

            <div className="flex rounded-xl overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition">

              <span className="flex items-center px-4 bg-slate-50 text-sm font-medium text-slate-500 border-r border-slate-200">
                +91
              </span>

              <input
                type="tel"
                value={mobile}
                onChange={(e) =>
                  setMobile(
                    e.target.value.replace(/\D/g, "").slice(0, 10)
                  )
                }
                placeholder="10-digit mobile number"
                className="w-full px-4 py-3.5 outline-none text-slate-900 placeholder:text-slate-400"
                maxLength={10}
                autoComplete="tel"
              />

            </div>

            <p className="mt-2 text-xs text-slate-400">
              We'll use this number to securely verify your identity.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-7 bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-teal-200 hover:shadow-teal-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending OTP..." : "Continue"}
            </button>

          </form>

          {/* Demo notice */}
          <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg">🧪</span>

              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Demo Mode
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700">
                  SMS delivery is currently disabled. A demo OTP will
                  be shown on the verification screen.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-400">
          Sehat Saathi • Secure healthcare access
        </div>

      </div>
    </div>
  );
}