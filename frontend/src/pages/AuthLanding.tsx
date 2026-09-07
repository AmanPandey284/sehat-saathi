import { useNavigate } from "react-router-dom";

export default function AuthLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-5xl">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-600 shadow-lg shadow-teal-200 mb-5">
            <span className="text-2xl text-white">✚</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            Sehat <span className="text-teal-600">Saathi</span>
          </h1>

          <p className="mt-3 text-base md:text-lg text-slate-500">
            Your health, connected.
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Choose how you want to continue
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">

          {/* Patient */}
          <button
            onClick={() => navigate("/patient/login")}
            className="group text-left bg-white rounded-3xl border border-teal-100 p-7 md:p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center group-hover:bg-teal-100 transition">
                <span className="text-2xl">👤</span>
              </div>

              <span className="text-teal-500 text-xl opacity-0 group-hover:opacity-100 transition">
                →
              </span>
            </div>

            <h2 className="mt-7 text-2xl font-bold text-slate-900">
              Patient
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Access your health journey using your mobile number and a
              secure OTP.
            </p>

            <div className="mt-6 inline-flex items-center text-sm font-semibold text-teal-600">
              Continue as Patient
              <span className="ml-2 group-hover:translate-x-1 transition">
                →
              </span>
            </div>
          </button>

          {/* Doctor */}
          <button
            onClick={() => navigate("/doctor/login")}
            className="group text-left bg-white rounded-3xl border border-cyan-100 p-7 md:p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-cyan-50 flex items-center justify-center group-hover:bg-cyan-100 transition">
                <span className="text-2xl">🩺</span>
              </div>

              <span className="text-cyan-500 text-xl opacity-0 group-hover:opacity-100 transition">
                →
              </span>
            </div>

            <h2 className="mt-7 text-2xl font-bold text-slate-900">
              Doctor
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Access the clinical dashboard using your verified doctor
              credentials.
            </p>

            <div className="mt-6 inline-flex items-center text-sm font-semibold text-cyan-600">
              Continue as Doctor
              <span className="ml-2 group-hover:translate-x-1 transition">
                →
              </span>
            </div>
          </button>

        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            Secure access
            <span>•</span>
            <span>Simple</span>
            <span>•</span>
            <span>Connected</span>
          </div>
        </div>

      </div>
    </div>
  );
}