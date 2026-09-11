import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AppHeader from "../../components/AppHeader";
import VoiceInputButton from "../../components/VoiceInputButton";
import { useLanguage } from "../../i18n/LanguageContext";
import { classifyFreeText, classifyFromQuickButton, classifyRouted, SUPPORTED_COMPLAINTS, type ComplaintClassification } from "./services/complaintClassifier";
import { usePatientSession } from "./state/PatientSessionContext";
import { normalizeDuration } from "./services/durationNormalizer";
import { detectUrgentComplaintText } from "../safety/safetyEngine";
import { analyzePatientInput } from "../../adaptiveQuestionEngine";

type Step = "input" | "unknown" | "confirm";

export default function ChiefComplaintFlow() {
  const { t, language } = useLanguage(); const navigate = useNavigate();
  const { setChiefComplaint, safetyFlags, setSafetyFlags, consentGranted } = usePatientSession();
  useEffect(()=>{if(!consentGranted)navigate('/patient/consent',{replace:true})},[consentGranted,navigate]);
  useEffect(()=>{
    if(safetyFlags.some(f=>f.severity==='urgent')){
      navigate('/patient/emergency',{replace:true});
    }
  },[safetyFlags,navigate]);
  if(safetyFlags.some(f=>f.severity==='urgent')) return null;

  const [step,setStep]=useState<Step>("input"); const [draftInput,setDraftInput]=useState("");
  const [validationError,setValidationError]=useState<string|null>(null);
  const [classification,setClassification]=useState<ComplaintClassification|null>(null);

  function handleQuickButton(id:(typeof SUPPORTED_COMPLAINTS)[number]){
    setValidationError(null); setClassification(classifyFromQuickButton(id)); setStep("confirm");
  }
function handleContinue() {
  if (!draftInput.trim()) {
    setValidationError(t.complaint.emptyInputError);
    return;
  }

  setValidationError(null);

  // ── Priority 1: Safety gate — always runs first, never moved ────────────
  const urgentFlag = detectUrgentComplaintText(draftInput);

  if (urgentFlag) {
    setSafetyFlags([urgentFlag]);
    navigate("/patient/emergency");
    return;
  }

  // ── Priority 2: Existing supported complaints (abdominal pain / fever / cough) ──
  const result = classifyFreeText(draftInput);
  setClassification(result);

  if (result.complaintId) {
    // Known supported complaint — show the confirm step (unchanged behaviour)
    setStep("confirm");
    return;
  }

  // ── Priority 3: Six new body-system categories ───────────────────────────
  const routedResult = classifyRouted(draftInput);

  if (routedResult.complaintId) {
    // Routed to a named body-system flow — navigate directly, no confirm step
    // needed because the display name is already meaningful.
    setChiefComplaint({
      complaintId: routedResult.complaintId,
      displayName: routedResult.displayName ?? routedResult.originalInput,
      originalInput: draftInput,
      confidence: routedResult.confidence,
      source: "patient",
    });

    // Do NOT run the adaptive overlay for dedicated routes: the structured
    // QuestionFlow for this category already covers the same clinical
    // territory. Running the overlay as well would ask duplicate questions.
    // The overlay is still active for the custom-fallback path (Priority 4).
    sessionStorage.removeItem("sehatSaathi_adaptive_analysis");

    navigate("/patient/history");
    return;
  }

  // ── Priority 4: Adaptive overlay — unrecognised free text with concepts ──
  const adaptiveAnalysis = analyzePatientInput(draftInput);

  if (
    adaptiveAnalysis.questions.length > 0 &&
    adaptiveAnalysis.concepts.some(
      (concept) => concept !== "unknown",
    )
  ) {
    sessionStorage.setItem(
      "sehatSaathi_adaptive_analysis",
      JSON.stringify(adaptiveAnalysis),
    );

    setChiefComplaint({
      complaintId: "custom",
      displayName: draftInput,
      originalInput: draftInput,
      confidence: 0.8,
      source: "patient",
    });

    navigate("/patient/history");
    return;
  }

  // ── Priority 5: Generic custom fallback ──────────────────────────────────
  setStep("unknown");
}
  function handleConfirmYes(){
    if(!classification?.complaintId||!classification.displayName)return;
    sessionStorage.removeItem("sehatSaathi_adaptive_analysis");
    setChiefComplaint({complaintId:classification.complaintId,displayName:classification.displayName,originalInput:classification.originalInput,confidence:classification.confidence,source:"patient"});
    navigate("/patient/history");
  }
  const duration = classification?.originalInput ? normalizeDuration(classification.originalInput) : null;
  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-6 pb-20 pt-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-clinic-600">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-clinic-100 text-clinic-700 text-[11px]">
              2
            </span>
            <span>{t.complaint.progressLabel}</span>
          </div>

          {step === "input" && (
            <div className="mt-4 rounded-3xl border border-clinic-100 bg-white/90 p-8 shadow-sm sm:p-10 glass-card">
              <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                {t.complaint.heading}
              </h1>
              <p className="mt-2 text-sm text-muted">
                {language === "hi"
                  ? "अपनी भाषा में बताएं कि आपको क्या तकलीफ हो रही है। आप बोलकर भी बता सकते हैं।"
                  : "Explain your symptom in simple everyday language. You can speak or type."}
              </p>

              <label htmlFor="complaint-input" className="sr-only">
                {t.complaint.textareaLabel}
              </label>
              <textarea
                id="complaint-input"
                value={draftInput}
                onChange={(e) => setDraftInput(e.target.value)}
                placeholder={t.complaint.textareaPlaceholder}
                rows={4}
                className="mt-5 w-full rounded-2xl border border-clinic-200 p-4 text-base sm:text-lg text-ink focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-100 transition shadow-xs"
              />

              <div className="mt-3 flex items-center gap-3">
                <VoiceInputButton
                  language={language}
                  onTranscript={(text) => {
                    setDraftInput(text);
                    setValidationError(null);
                  }}
                />
                <span className="text-xs text-muted">
                  {language === "hi" ? "बोलकर भी अपनी समस्या बताएं" : "Or describe your concern by speaking"}
                </span>
              </div>

              {validationError && (
                <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {validationError}
                </p>
              )}

              <div className="mt-6 border-t border-clinic-100 pt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  {language === "hi" ? "त्वरित विकल्प" : "Common Chief Complaints"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {SUPPORTED_COMPLAINTS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleQuickButton(id)}
                      className="rounded-full border border-clinic-200 bg-white px-4 py-2 text-sm font-medium text-clinic-800 hover:border-clinic-400 hover:bg-clinic-50 transition shadow-2xs"
                    >
                      {t.complaint.quickButtons[id]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-clinic-100 pt-6">
                <Link
                  to="/patient/profile"
                  className="rounded-full border border-clinic-200 px-6 py-3 text-center text-sm font-medium text-muted hover:bg-clinic-50 transition"
                >
                  {t.complaint.backButton}
                </Link>
                <button
                  type="button"
                  onClick={handleContinue}
                  className="rounded-full bg-clinic-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-clinic-700 transition"
                >
                  {t.complaint.continueButton} →
                </button>
              </div>
            </div>
          )}

          {step === "unknown" && (
            <div className="mt-4 rounded-3xl border border-clinic-100 bg-white/90 p-8 shadow-sm sm:p-10 glass-card">
              <span className="text-3xl" aria-hidden>📝</span>
              <h1 className="mt-3 font-display text-2xl font-semibold text-ink">
                {language === "hi" ? "अपनी समस्या दर्ज करें" : "Recorded in your words"}
              </h1>
              <p className="mt-3 text-sm text-muted leading-relaxed">
                {language === "hi"
                  ? "आपकी समस्या आपके ही शब्दों में सहेजी गई है। क्लिनिकल हिस्ट्री बिना किसी अनुमान के जारी रहेगी।"
                  : "Your problem was saved in your own words. A general intake will continue without guessing a diagnosis."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setChiefComplaint({
                      complaintId: "custom",
                      displayName: "Other / custom complaint",
                      originalInput: draftInput,
                      confidence: 0,
                      source: "patient",
                    });
                    navigate("/patient/history");
                  }}
                  className="rounded-full bg-clinic-600 px-7 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-clinic-700 transition"
                >
                  Continue with my concern →
                </button>
                <button
                  onClick={() => setStep("input")}
                  className="rounded-full border border-clinic-200 px-6 py-3.5 text-sm font-medium text-muted hover:bg-clinic-50 transition"
                >
                  Change input
                </button>
              </div>
            </div>
          )}

          {step === "confirm" && classification?.displayName && (
            <div className="mt-4 rounded-3xl border border-clinic-100 bg-white/90 p-8 shadow-sm sm:p-10 glass-card">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-clinic-100 text-clinic-700 text-xs">
                  ✓
                </span>
                <p className="text-xs font-bold uppercase tracking-wider text-clinic-600">
                  {language === "hi" ? "शिकायत की पहचान" : "Identified Chief Complaint"}
                </p>
              </div>

              <h1 className="mt-3 font-display text-2xl font-semibold text-ink sm:text-3xl">
                {classification.displayName}
              </h1>
              <p className="mt-2 text-sm text-muted">
                {language === "hi" ? "रोगी ने बताया:" : "Patient reported:"} “{classification.originalInput}”
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-clinic-100 bg-clinic-50/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Category</p>
                  <p className="mt-1 font-semibold text-clinic-900">{classification.displayName}</p>
                </div>
                {duration?.normalizedDays != null && (
                  <div className="rounded-2xl border border-clinic-100 bg-clinic-50/70 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Normalized Duration</p>
                    <p className="mt-1 font-semibold text-clinic-900">{duration.normalizedDays} days</p>
                  </div>
                )}
              </div>

              <p className="mt-6 text-sm font-medium text-ink">
                {language === "hi" ? "क्या यह जानकारी सही है?" : "Does this accurately describe your main reason for visit?"}
              </p>

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-clinic-100 pt-6">
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="rounded-full border border-clinic-200 px-6 py-3 text-sm font-medium text-muted hover:bg-clinic-50 transition"
                >
                  {language === "hi" ? "बदलें" : "Modify"}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmYes}
                  className="rounded-full bg-clinic-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-clinic-700 transition"
                >
                  {language === "hi" ? "हाँ, आगे बढ़ें" : "Yes, Continue to History"} →
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · Chief Complaint Intake
      </footer>
    </div>
  );
}
