import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export default function DoctorLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registrationId, setRegistrationId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !registrationId) {
      alert("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/auth/doctor/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            registration_id: registrationId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Invalid doctor credentials");
        return;
      }

      localStorage.setItem(
        "doctor_access_token",
        data.access_token
      );

      localStorage.setItem(
        "doctor_user",
        JSON.stringify(data.user)
      );

      navigate("/doctor");
    } catch (error) {
      console.error(error);
      alert("Unable to connect to the backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 flex items-center justify-center px-5 py-10">

      <div className="w-full max-w-md">

        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="mb-6 inline-flex items-center text-sm font-medium text-slate-500 hover:text-cyan-600 transition"
        >
          <span className="mr-2">←</span>
          Back
        </button>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-cyan-100 shadow-xl shadow-cyan-100/40 p-7 md:p-9">

          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-cyan-50 flex items-center justify-center mb-6">
            <span className="text-2xl">🩺</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Doctor Login
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Sign in using your registered email, password and
            medical registration ID.
          </p>

          <form onSubmit={handleLogin} className="mt-8">

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@example.com"
                autoComplete="email"
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 outline-none text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
              />
            </div>

            {/* Password */}
            <div className="mt-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 outline-none text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
              />
            </div>

            {/* Registration ID */}
            <div className="mt-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Medical Registration ID
              </label>

              <input
                type="text"
                value={registrationId}
                onChange={(e) =>
                  setRegistrationId(e.target.value.toUpperCase())
                }
                placeholder="e.g. REG001"
                autoComplete="off"
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 outline-none text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
              />
            </div>

            {/* Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-7 bg-cyan-600 hover:bg-cyan-700 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-cyan-200 hover:shadow-cyan-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

          </form>

          {/* Demo notice */}
          <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4">

            <div className="flex items-start gap-3">
              <span className="text-lg">🧪</span>

              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Prototype Demo
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700">
                  Doctor authentication is currently using
                  prototype credentials. Production authentication
                  will use securely stored doctor accounts.
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-400">
          Sehat Saathi • Secure clinical access
        </div>

      </div>

    </div>
  );
}