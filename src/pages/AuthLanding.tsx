import { useNavigate } from "react-router-dom";

export default function AuthLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-600 shadow-lg shadow-teal-200 mb-4">
            <span className="text-2xl text-white font-bold">✚</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
            Sehat <span className="text-teal-600">Saathi</span>
          </h1>

          <p className="mt-2 text-base md:text-lg text-slate-600 font-medium">
            AI-Assisted Structured Clinical Intake & Physician Review
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Select your workflow to proceed
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Guest / Direct Demo Intake */}
          <button
            onClick={() => navigate("/patient/entry")}
            className="group text-left bg-white rounded-3xl border border-emerald-100 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div className="w-13 h-13 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition p-3">
                <span className="text-2xl">⚡</span>
              </div>
              <span className="text-emerald-500 text-xl opacity-0 group-hover:opacity-100 transition">→</span>
            </div>

            <h2 className="mt-6 text-xl font-bold text-slate-900">Quick Intake</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Immediate clinical intake without login. Fill symptoms, documents, or AYUSH history directly.
            </p>

            <div className="mt-5 inline-flex items-center text-xs font-semibold text-emerald-600">
              Start Demo Intake <span className="ml-1 group-hover:translate-x-1 transition">→</span>
            </div>
          </button>

          {/* Patient with Verified OTP */}
          <button
            onClick={() => navigate("/patient/login")}
            className="group text-left bg-white rounded-3xl border border-teal-100 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div className="w-13 h-13 rounded-2xl bg-teal-50 flex items-center justify-center group-hover:bg-teal-100 transition p-3">
                <span className="text-2xl">👤</span>
              </div>
              <span className="text-teal-500 text-xl opacity-0 group-hover:opacity-100 transition">→</span>
            </div>

            <h2 className="mt-6 text-xl font-bold text-slate-900">Patient OTP</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Authenticate via verified one-time code to link past visits, ABHA identity, and encrypted records.
            </p>

            <div className="mt-5 inline-flex items-center text-xs font-semibold text-teal-600">
              Patient Login <span className="ml-1 group-hover:translate-x-1 transition">→</span>
            </div>
          </button>

          {/* Doctor EHR Access */}
          <button
            onClick={() => navigate("/doctor/login")}
            className="group text-left bg-white rounded-3xl border border-cyan-100 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div className="w-13 h-13 rounded-2xl bg-cyan-50 flex items-center justify-center group-hover:bg-cyan-100 transition p-3">
                <span className="text-2xl">🩺</span>
              </div>
              <span className="text-cyan-500 text-xl opacity-0 group-hover:opacity-100 transition">→</span>
            </div>

            <h2 className="mt-6 text-xl font-bold text-slate-900">Physician Portal</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Authorized clinical dashboard for licensed practitioners with sign-off, safety triage, and review notes.
            </p>

            <div className="mt-5 inline-flex items-center text-xs font-semibold text-cyan-600">
              Physician Access <span className="ml-1 group-hover:translate-x-1 transition">→</span>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-xs text-slate-400">
            Smart India Hackathon 2026 · Problem Statement SIH26047 · Clinical Decision-Support Prototype
          </p>
        </div>
      </div>
    </div>
  );
}
