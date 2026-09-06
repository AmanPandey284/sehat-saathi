import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AppHeader from "../../components/AppHeader";
import { useLanguage } from "../../i18n/LanguageContext";
import { classifyFreeText, classifyFromQuickButton, SUPPORTED_COMPLAINTS, type ComplaintClassification } from "./services/complaintClassifier";
import { usePatientSession } from "./state/PatientSessionContext";
import { normalizeDuration } from "./services/durationNormalizer";
import { detectUrgentComplaintText } from "../safety/safetyEngine";
import { analyzePatientInput } from "../../adaptiveQuestionEngine";

type Step = "input" | "unknown" | "confirm";

export default function ChiefComplaintFlow() {
  const { t } = useLanguage(); const navigate = useNavigate();
  const { setChiefComplaint, setSafetyFlags, consentGranted } = usePatientSession();
  useEffect(()=>{if(!consentGranted)navigate('/patient/consent',{replace:true})},[consentGranted,navigate]);
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

  // Safety check comes first
  const urgentFlag = detectUrgentComplaintText(draftInput);

  if (urgentFlag) {
    setSafetyFlags([urgentFlag]);
    navigate("/patient/emergency");
    return;
  }

  // Analyze the patient's free-text input
  const adaptiveAnalysis = analyzePatientInput(draftInput);

  // Save the analysis for AdaptiveHistoryFlow
  sessionStorage.setItem(
    "sehatSaathi_adaptive_analysis",
    JSON.stringify(adaptiveAnalysis),
  );

  // Keep the existing classifier
  const result = classifyFreeText(draftInput);
  setClassification(result);

  // If relevant concepts were detected,
  // go directly to the adaptive history.
  if (
    adaptiveAnalysis.questions.length > 0 &&
    adaptiveAnalysis.concepts.some(
      (concept) => concept !== "unknown",
    )
  ) {
    const primaryConcept =
      adaptiveAnalysis.concepts.find(
        (concept) => concept !== "unknown",
      );

    const conceptLabels: Record<string, string> = {
      headache: "Headache",
      abdominal_pain: "Abdominal pain",
      chest_pain: "Chest pain",
      breathing: "Breathing difficulty",
      fever: "Fever",
      cough: "Cough",
      vomiting: "Vomiting",
      diarrhea: "Diarrhea",
      dizziness: "Dizziness",
      rash: "Rash",
      urinary: "Urinary symptoms",
      joint_pain: "Joint pain",
      back_pain: "Back pain",
      weakness: "Weakness",
      swelling: "Swelling",
      bleeding: "Bleeding",
      pain: "Pain",
    };

    const primaryLabel =
      (primaryConcept && conceptLabels[primaryConcept]) ||
      result.displayName ||
      "Reported symptom";

    setChiefComplaint({
      complaintId: "custom",
      displayName: primaryLabel,
      originalInput: draftInput,
      confidence: result.confidence ?? 0.8,
      source: "patient",
    });

    navigate("/patient/history");
    return;
  }

  // Otherwise keep the existing flow
  setStep(result.complaintId ? "confirm" : "unknown");
}
  function handleConfirmYes(){
    if(!classification?.complaintId||!classification.displayName)return;
    setChiefComplaint({complaintId:classification.complaintId,displayName:classification.displayName,originalInput:classification.originalInput,confidence:classification.confidence,source:"patient"});
    navigate("/patient/history");
  }
  const duration = classification?.originalInput ? normalizeDuration(classification.originalInput) : null;
  return <div className="min-h-screen bg-canvas"><AppHeader/><main className="mx-auto max-w-2xl px-6 pb-20 pt-4">
    <p className="text-sm font-medium uppercase tracking-wide text-clinic-500">{t.complaint.progressLabel}</p>
    {step==="input"&&<div className="mt-3 rounded-2xl border border-clinic-100 bg-white p-8 shadow-sm sm:p-10">
      <h1 className="font-display text-3xl font-semibold text-ink">{t.complaint.heading}</h1>
      <label htmlFor="complaint-input" className="sr-only">{t.complaint.textareaLabel}</label>
      <textarea id="complaint-input" value={draftInput} onChange={e=>setDraftInput(e.target.value)} placeholder={t.complaint.textareaPlaceholder} rows={4} className="mt-6 w-full rounded-xl border border-clinic-200 p-4 text-lg text-ink"/>
      {validationError&&<p role="alert" className="mt-2 text-sm text-flag-700">{validationError}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        {SUPPORTED_COMPLAINTS.map(id=><button key={id} type="button" onClick={()=>handleQuickButton(id)} className="rounded-full border border-clinic-200 bg-white px-5 py-3 text-base font-medium text-clinic-700 hover:bg-clinic-50">{t.complaint.quickButtons[id]}</button>)}
      </div>
      <div className="mt-8 flex justify-between gap-3"><Link to="/patient/profile" className="rounded-full border border-clinic-200 px-7 py-3 text-center text-lg text-muted">{t.complaint.backButton}</Link><button type="button" onClick={handleContinue} className="rounded-full bg-clinic-600 px-7 py-3 text-lg font-medium text-white">{t.complaint.continueButton}</button></div>
    </div>}
    {step==="unknown"&&<div className="mt-3 rounded-2xl border border-clinic-100 bg-white p-8 shadow-sm sm:p-10">
      <h1 className="font-display text-2xl font-semibold text-ink">Add your problem</h1>
      <p className="mt-3 text-muted">Your problem was saved in your own words. A general intake will continue without guessing a diagnosis.</p>
      <button onClick={()=>{setChiefComplaint({complaintId:"custom",displayName:"Other / custom complaint",originalInput:draftInput,confidence:0,source:"patient"});navigate('/patient/history')}} className="mt-8 rounded-full bg-clinic-600 px-7 py-3 text-white">Continue with my problem</button>
      <button onClick={()=>setStep("input")} className="ml-3 rounded-full border border-clinic-200 px-7 py-3 text-muted">Change</button>
    </div>}
    {step==="confirm"&&classification?.displayName&&<div className="mt-3 rounded-2xl border border-clinic-100 bg-white p-8 shadow-sm sm:p-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-clinic-600">Sehat Saathi understood</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{classification.displayName}</h1>
      <p className="mt-3 text-muted">Patient said: “{classification.originalInput}”</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-clinic-50 p-4"><p className="text-xs uppercase tracking-wide text-muted">Complaint</p><p className="mt-1 font-semibold text-clinic-800">{classification.displayName}</p></div>
        {duration?.normalizedDays!=null&&<div className="rounded-xl bg-clinic-50 p-4"><p className="text-xs uppercase tracking-wide text-muted">Duration</p><p className="mt-1 font-semibold text-clinic-800">{duration.normalizedDays} days</p></div>}
      </div>
      <p className="mt-5 text-ink">Is this correct?</p>
      <div className="mt-8 flex justify-between gap-3"><button onClick={()=>setStep("input")} className="rounded-full border border-clinic-200 px-7 py-3 text-muted">Change</button><button onClick={handleConfirmYes} className="rounded-full bg-clinic-600 px-7 py-3 text-white">Yes, continue with adaptive history</button></div>
    </div>}
  </main></div>
}
