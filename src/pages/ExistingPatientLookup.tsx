import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { useLanguage } from "../i18n/LanguageContext";
import { usePatientSession } from "../features/patient/state/PatientSessionContext";
import {
  findPatientRecord,
  saveReturningSession,
  getKnownConditions,
  getKnownMedications,
  getKnownAllergies,
  type ReturningPatientSession,
} from "../features/patient/returningPatientModel";
import type { StoredPatientRecord } from "../features/doctor/patientRecords";

export default function ExistingPatientLookup() {
  const nav = useNavigate();
  const { language } = useLanguage();
  const session = usePatientSession();

  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const selectPatient = (record: StoredPatientRecord) => {
    // Populate the patient session with the existing record baseline
    session.setPatientProfile(record.patientProfile);
    session.setConsentGranted(true);
    session.setBackgroundHistory(record.backgroundHistory);
    session.setTimeline(record.timeline || []);

    // Create the returning session state
    const knownConditions = getKnownConditions(record);
    const knownMeds = getKnownMedications(record);
    const knownAllergies = getKnownAllergies(record);

    const returningSession: ReturningPatientSession = {
      previousRecord: record,
      changes: {
        visitReason: "follow_up",
        visitReasonLabel: "Follow-up on previous consultation",
        previousConsultationDate: record.submittedAt,
        previousComplaint: record.chiefComplaint?.displayName,
        unchangedConditions: knownConditions,
        changedConditions: [],
        unchangedMedications: knownMeds,
        changedMedications: [],
        allergiesStatus: "unchanged",
        allergiesNote: knownAllergies,
        hospitalizationSinceLastVisit: false,
        newDocumentsCount: 0,
      },
    };

    saveReturningSession(returningSession);
    nav("/patient/returning");
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setError(
        language === "hi"
          ? "कृपया अपना पेशेंट आईडी या पंजीकृत मोबाइल नंबर दर्ज करें।"
          : "Please enter your Patient ID or registered mobile number."
      );
      return;
    }

    setSearching(true);
    setError(null);

    setTimeout(() => {
      const match = findPatientRecord(cleanQuery);
      setSearching(false);
      if (match) {
        selectPatient(match);
      } else {
        setError(
          language === "hi"
            ? "इस आईडी या नंबर से कोई पुराना रिकॉर्ड नहीं मिला। कृपया पुनः प्रयास करें या नए मरीज के रूप में शुरू करें।"
            : "No existing patient record found matching that ID or number. Please verify or start as a new patient."
        );
      }
    }, 200);
  };

  const handleStartNew = () => {
    session.resetSession();
    try {
      sessionStorage.removeItem("sehatSaathi_adaptive_analysis");
      sessionStorage.removeItem("sehatSaathi_returning_session_v1");
    } catch {}
    nav("/patient/consent");
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader showStatus={false} />
        <main className="mx-auto max-w-2xl px-6 pb-20 pt-8">
          <div className="rounded-3xl border border-clinic-100 bg-white/90 p-8 shadow-sm sm:p-10 glass-card">
            
            {/* Header */}
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-clinic-100 text-clinic-700 text-xl" aria-hidden>
                🔍
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-clinic-600">
                  {language === "hi" ? "पुराना मरीज पहचान" : "Returning Patient Lookup"}
                </span>
                <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                  {language === "hi" ? "वापसी पर स्वागत है" : "Welcome back"}
                </h1>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted">
              {language === "hi"
                ? "अपना पिछला मेडिकल रिकॉर्ड खोजने के लिए अपना पेशेंट आईडी या पंजीकृत मोबाइल नंबर दर्ज करें।"
                : "Find your patient record by entering your Patient ID or registered phone number."}
            </p>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="patient-lookup-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5"
                >
                  {language === "hi" ? "पेशेंट आईडी या मोबाइल नंबर" : "Patient ID or Mobile Number"}
                </label>
                <div className="flex gap-2">
                  <input
                    id="patient-lookup-input"
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={
                      language === "hi"
                        ? "उदा. ABHA-91-4458-1200 या 9876543210"
                        : "e.g. ABHA-91-4458-1200, DEMO-88219, or 9876543210"
                    }
                    className="w-full rounded-xl border border-clinic-200 bg-white px-4 py-3 text-sm text-ink placeholder:text-muted/60 focus:border-clinic-500 focus:outline-hidden focus:ring-2 focus:ring-clinic-200 transition"
                  />
                  <button
                    type="submit"
                    disabled={searching}
                    className="shrink-0 rounded-xl bg-clinic-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-clinic-700 transition disabled:opacity-50"
                  >
                    {searching
                      ? language === "hi" ? "खोज रहे हैं…" : "Searching…"
                      : language === "hi" ? "खोजें" : "Find Record"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-800 leading-relaxed">
                  {error}
                </div>
              )}
            </form>

            {/* Demo Patient Fast-Track (Clearly marked, privacy-safe) */}
            <div className="mt-8 rounded-2xl border border-clinic-100 bg-clinic-50/50 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-clinic-700">
                  {language === "hi" ? "💡 डेमो मरीज टेस्ट विकल्प" : "💡 Demo Patient Shortcuts"}
                </p>
                <span className="rounded-full bg-clinic-100 px-2.5 py-0.5 text-[10px] font-medium text-clinic-700">
                  {language === "hi" ? "प्रोटोटाइप डेमो" : "Prototype Mode"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {language === "hi"
                  ? "परीक्षण के लिए किसी भी पूर्व-सहेजे गए मरीज का चयन करें:"
                  : "Select a pre-seeded patient to test zero-repetition intake:"}
              </p>

              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    const r = findPatientRecord("DEMO-REC-001");
                    if (r) selectPatient(r);
                  }}
                  className="rounded-xl border border-clinic-200 bg-white p-3 text-left transition hover:border-clinic-400 hover:shadow-xs group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-ink group-hover:text-clinic-700">
                      Ramesh Patel · 48M
                    </span>
                    <span className="text-[10px] text-muted">ID: 4458-1200</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted leading-tight">
                    Type 2 Diabetes · Metformin · Cough follow-up
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const r = findPatientRecord("DEMO-REC-002");
                    if (r) selectPatient(r);
                  }}
                  className="rounded-xl border border-clinic-200 bg-white p-3 text-left transition hover:border-clinic-400 hover:shadow-xs group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-ink group-hover:text-clinic-700">
                      Sunita Devi · 36F
                    </span>
                    <span className="text-[10px] text-muted">ID: DEMO-88219</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted leading-tight">
                    Acid Reflux · Antacids · Abdominal review
                  </p>
                </button>
              </div>
            </div>

            {/* Alternative Actions */}
            <div className="mt-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-clinic-100 pt-6">
              <button
                type="button"
                onClick={() => nav("/patient/entry")}
                className="text-xs font-medium text-muted hover:text-ink transition"
              >
                ← {language === "hi" ? "वापस चयन पर जाएं" : "Back to selection"}
              </button>

              <button
                type="button"
                onClick={handleStartNew}
                className="text-xs font-semibold text-clinic-700 hover:text-clinic-800 transition"
              >
                {language === "hi" ? "नए मरीज के रूप में शुरू करें" : "Not on file? Start as New Patient"} →
              </button>
            </div>

          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · Longitudinal Health Record Lookup
      </footer>
    </div>
  );
}
