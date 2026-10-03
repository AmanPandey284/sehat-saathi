import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { BASE_URL } from "../services/api";

export default function DoctorRegister() {

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    medical_system: "Allopathy",
    specialty: "General Medicine",
    registration_number: "",
    council_name: "State Medical Council",
    years_of_experience: 3,
    hospital_name: "",
  });

  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      setBusy(true);
      const res = await fetch(`${BASE_URL}/api/auth/doctor/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || "Registration submission failed.");
        return;
      }

      setSuccessMsg(
        "Application submitted successfully! Your credentials are now pending verification by a clinical administrator. You will be able to log in once approved."
      );
    } catch {
      setErrorMsg("Network error connecting to backend.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader />
        <main className="mx-auto max-w-xl px-6 py-10">
          <div className="rounded-3xl border border-clinic-100 bg-white/95 p-8 shadow-sm sm:p-10 glass-card">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-clinic-50 text-2xl border border-clinic-100">
                📋
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-clinic-600">
                  Onboarding & Verification
                </p>
                <h1 className="font-display text-2xl font-semibold text-ink">
                  Physician Registration
                </h1>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-6">
              To maintain clinical safety and regulatory compliance, physician accounts require verified registration numbers and clinical administrative review before EHR access is granted.
            </p>

            {successMsg && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 leading-relaxed">
                <p className="font-bold mb-1">✓ Application Received</p>
                {successMsg}
                <div className="mt-3">
                  <Link to="/doctor/login" className="font-semibold text-emerald-700 underline">
                    Return to Doctor Login →
                  </Link>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            {!successMsg && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="Dr. Rajesh Kumar"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="rajesh@hospital.org"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Medical System</label>
                    <select
                      value={formData.medical_system}
                      onChange={(e) => setFormData({ ...formData, medical_system: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                    >
                      <option value="Allopathy">Modern Medicine (Allopathy)</option>
                      <option value="Ayurveda">Ayurveda (AYUSH)</option>
                      <option value="Homeopathy">Homeopathy (AYUSH)</option>
                      <option value="Unani">Unani (AYUSH)</option>
                      <option value="Siddha">Siddha (AYUSH)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Specialty</label>
                    <input
                      type="text"
                      placeholder="e.g. Internal Medicine / Kayachikitsa"
                      value={formData.specialty}
                      onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Registration / License Number</label>
                    <input
                      type="text"
                      placeholder="e.g. MCI-12345 / DMC-6789"
                      value={formData.registration_number}
                      onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Medical Council / Board</label>
                    <input
                      type="text"
                      placeholder="e.g. Delhi Medical Council"
                      value={formData.council_name}
                      onChange={(e) => setFormData({ ...formData, council_name: e.target.value })}
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Affiliated Hospital / Health Center</label>
                  <input
                    type="text"
                    placeholder="e.g. AIIMS New Delhi / Civil Hospital"
                    value={formData.hospital_name}
                    onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full mt-4 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-teal-600/20 disabled:opacity-50 transition"
                >
                  {busy ? "Submitting Application..." : "Submit Registration for Verification"}
                </button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <Link to="/doctor/login" className="text-xs text-slate-500 hover:text-teal-600 font-medium">
                Already registered? <span className="font-semibold underline">Sign In Here</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
