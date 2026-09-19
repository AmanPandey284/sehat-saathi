import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { useLanguage } from "../i18n/LanguageContext";
import { usePatientSession } from "../features/patient/state/PatientSessionContext";
import {
  loadReturningSession,
  saveReturningSession,
  type ReturningPatientSession,
} from "../features/patient/returningPatientModel";
import { savePatientRecord, type StoredPatientRecord } from "../features/doctor/patientRecords";
import { determineSuggestedRouting } from "../features/routing/routingService";
import { calculateWorkflowDurations } from "../features/timing/timingUtils";

export default function ReturningPatientOptions() {
  const nav = useNavigate();
  const { language } = useLanguage();
  const session = usePatientSession();
  const [sessionData, setSessionData] = useState<ReturningPatientSession | null>(null);

  useEffect(() => {
    const s = loadReturningSession();
    if (!s || !s.previousRecord) {
      nav("/patient/lookup", { replace: true });
      return;
    }
    setSessionData(s);
  }, [nav]);

  if (!sessionData) return null;

  const { previousRecord, changes } = sessionData;

  const handleFinishToReview = () => {
    // MANDATORY CLINICAL SAFETY GATE:
    // Ensure safety screening has been performed; Quick Pass must NEVER bypass safetyEngine
    if (!session.historyAnswers?.safety_screened) {
      nav("/patient/returning/safety");
      return;
    }

    // Generate longitudinal timeline events for today's visit
    const nowIso = new Date().toISOString();
    const todayEvents = [
      {
        id: `tl-ret-${Date.now()}`,
        date: nowIso,
        title: `Returning Consultation (${changes.visitReasonLabel})`,
        detail: changes.followUpStatus
          ? `Follow-up status: ${changes.followUpStatus}. ${changes.naturalLanguageUpdate || "No other changes reported."}`
          : changes.naturalLanguageUpdate || "Baseline confirmed without change.",
        source: "PATIENT" as const,
      },
    ];

    const combinedTimeline = [
      ...todayEvents,
      ...(previousRecord.timeline || []),
    ];

    const effectiveComplaint = session.chiefComplaint || {
      complaintId: previousRecord.chiefComplaint?.complaintId || "custom",
      displayName: `${changes.visitReasonLabel}: ${changes.followUpStatus ? `Status ${changes.followUpStatus}` : previousRecord.chiefComplaint?.displayName}`,
      originalInput: changes.naturalLanguageUpdate || changes.visitReasonLabel,
      confidence: 1.0,
      source: "patient" as const,
    };

    const combinedSafetyFlags = [
      ...(previousRecord.safetyFlags || []),
      ...session.safetyFlags,
    ];

    // FIX 1: Routing for today evaluates ONLY the current visit's safety status (session.safetyFlags).
    // Historical safety flags are preserved in combinedSafetyFlags for record continuity,
    // but must not cause today's safe follow-up encounter to falsely route to Emergency.
    const suggestedRouting = determineSuggestedRouting({
      complaintId: effectiveComplaint.complaintId,
      displayName: effectiveComplaint.displayName,
      originalInput: effectiveComplaint.originalInput,
      safetyFlags: session.safetyFlags,
    });

    // Build the updated stored patient record
    const updatedRecord: StoredPatientRecord = {
      ...previousRecord,
      id: previousRecord.id,
      submittedAt: nowIso,
      patientProfile: previousRecord.patientProfile,
      chiefComplaint: effectiveComplaint,
      historyAnswers: {
        ...previousRecord.historyAnswers,
        ...(session.historyAnswers || {}),
        returning_visit_reason: changes.visitReason,
        returning_followup_status: changes.followUpStatus || "not_applicable",
      },
      evidence: [...(previousRecord.evidence || []), ...session.evidence],
      safetyFlags: combinedSafetyFlags,
      documents: session.documents.length > 0 ? session.documents : previousRecord.documents,
      backgroundHistory: {
        ...previousRecord.backgroundHistory,
        pastMedical: changes.unchangedConditions.join(", "),
        medications: [
          ...changes.unchangedMedications,
          ...changes.changedMedications.map((m) => `${m.name} (${m.status})`),
        ].join(", "),
        allergies: changes.allergiesNote || previousRecord.backgroundHistory?.allergies,
      },
      timeline: combinedTimeline,
      doctorReviews: previousRecord.doctorReviews || [],
      ayushHistory: previousRecord.ayushHistory || {},
      reviewStatus: "pending",
      longitudinalChanges: changes,
      suggestedRouting,
      timestamps: (() => {
        const retTimestamps = {
          ...(previousRecord.timestamps || {}),
          ...(session.timestamps || {}),
          ...(changes.timestamps || {}),
          intakeCompletedAt: nowIso,
        };
        return retTimestamps;
      })(),
      durations: (() => {
        const retTimestamps = {
          ...(previousRecord.timestamps || {}),
          ...(session.timestamps || {}),
          ...(changes.timestamps || {}),
          intakeCompletedAt: nowIso,
        };
        return calculateWorkflowDurations(retTimestamps);
      })(),
    };

    savePatientRecord(updatedRecord);
    saveReturningSession({ ...sessionData, previousRecord: updatedRecord });
    nav("/patient/complete");
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader showStatus={false} />
        <main className="mx-auto max-w-2xl px-6 pb-20 pt-8">
          <div className="rounded-3xl border border-clinic-100 bg-white/90 p-8 shadow-sm sm:p-10 glass-card">
            
            {/* Header */}
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-clinic-200 bg-clinic-50 px-3.5 py-1 text-xs font-semibold text-clinic-700">
                <span>✓</span>
                <span>{language === "hi" ? "बदलाव सहेजे गए" : "Updates Recorded"}</span>
              </span>
              <h1 className="mt-3 font-display text-2xl font-semibold text-ink sm:text-3xl">
                {language === "hi" ? "आपकी जानकारी तैयार है" : "You're All Set"}
              </h1>
              <p className="mt-1 text-xs text-muted">
                {language === "hi"
                  ? "आपने बिना पुराना इतिहास दोबारा दर्ज किए आज की जानकारी अपडेट कर ली है।"
                  : "Zero repetition: your verified baseline was preserved and today's updates captured."}
              </p>
            </div>

            {/* Summary Preview Box */}
            <div className="mt-6 rounded-2xl border border-clinic-100 bg-clinic-50/50 p-4.5 text-xs text-ink space-y-2">
              <div className="flex items-center justify-between border-b border-clinic-100/60 pb-2">
                <span className="font-bold uppercase tracking-wider text-clinic-800">
                  {language === "hi" ? "आज का सारांश" : "Today's Visit Delta"}
                </span>
                <span className="rounded-full bg-clinic-100 px-2.5 py-0.5 font-semibold text-clinic-700">
                  {changes.visitReasonLabel}
                </span>
              </div>

              {changes.followUpStatus && (
                <p>
                  <strong className="text-muted">{language === "hi" ? "स्थिति:" : "Status:"}</strong>{" "}
                  {changes.followUpStatus.toUpperCase()}
                </p>
              )}

              <p>
                <strong className="text-muted">{language === "hi" ? "अपरिवर्तित स्थितियां:" : "Unchanged Conditions:"}</strong>{" "}
                {changes.unchangedConditions.join(", ")}
              </p>

              <p>
                <strong className="text-muted">{language === "hi" ? "दवाइयां:" : "Medications:"}</strong>{" "}
                {changes.unchangedMedications.join(", ")}
                {changes.changedMedications.length > 0 && (
                  <span className="text-amber-800 font-medium">
                    {" "}· {changes.changedMedications.map((m) => `${m.name} (${m.status})`).join(", ")}
                  </span>
                )}
              </p>

              {changes.naturalLanguageUpdate && (
                <p>
                  <strong className="text-muted">{language === "hi" ? "लक्षण टिप्पणी:" : "Note:"}</strong>{" "}
                  “{changes.naturalLanguageUpdate}”
                </p>
              )}

              <div className="flex items-center gap-1.5 pt-1.5 border-t border-clinic-100/80 text-[11px] font-semibold text-emerald-800">
                <span>🛡️</span>
                <span>
                  {session.historyAnswers?.safety_screened
                    ? language === "hi"
                      ? "क्लिनिकल सुरक्षा जांच: उत्तीर्ण (कोई आपातकालीन रेड-फ्लैग नहीं)"
                      : "Clinical Safety Check: Passed (No acute red flags reported)"
                    : language === "hi"
                      ? "सुरक्षा जांच लंबित"
                      : "Safety check required before submission"}
                </span>
              </div>
            </div>

            {/* Next Step Options */}
            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={handleFinishToReview}
                className="w-full flex items-center justify-between rounded-2xl bg-clinic-600 p-4 text-left font-semibold text-white shadow-sm hover:bg-clinic-700 transition"
              >
                <div>
                  <p className="text-sm">{language === "hi" ? "सीधे डॉक्टर कतार में भेजें" : "Submit to Physician Queue"}</p>
                  <p className="text-xs font-normal text-clinic-100">
                    {language === "hi" ? "कोई अन्य दस्तावेज या प्रश्न नहीं जोड़ना है" : "Finish now without answering further questions"}
                  </p>
                </div>
                <span className="text-lg">→</span>
              </button>

              <button
                type="button"
                onClick={() => nav("/patient/documents")}
                className="w-full flex items-center justify-between rounded-2xl border border-clinic-200 bg-white p-4 text-left font-semibold text-ink shadow-2xs hover:border-clinic-400 transition"
              >
                <div>
                  <p className="text-sm">{language === "hi" ? "नई जांच रिपोर्ट या पर्चा जोड़ें" : "Add New Reports or Prescription"}</p>
                  <p className="text-xs font-normal text-muted">
                    {language === "hi" ? "स्मार्ट ओसीआर से स्वचालित डेटा निष्कर्षण" : "Upload lab report or doctor slip for OCR extraction"}
                  </p>
                </div>
                <span className="text-clinic-600">📄</span>
              </button>

              <button
                type="button"
                onClick={() => nav("/patient")}
                className="w-full flex items-center justify-between rounded-2xl border border-clinic-200 bg-white p-4 text-left font-semibold text-ink shadow-2xs hover:border-clinic-400 transition"
              >
                <div>
                  <p className="text-sm">{language === "hi" ? "नया लक्षण विस्तार से बताएं" : "Report a New Symptom (Adaptive Questions)"}</p>
                  <p className="text-xs font-normal text-muted">
                    {language === "hi" ? "आज के नए लक्षण के लिए निर्देशित क्लीनिकल प्रश्न" : "Answer questions tailored to today's new complaint"}
                  </p>
                </div>
                <span className="text-clinic-600">🩺</span>
              </button>
            </div>

            {/* Back to Changes */}
            <div className="mt-6 pt-4 border-t border-clinic-100 text-center">
              <button
                type="button"
                onClick={() => nav("/patient/returning/changes")}
                className="text-xs font-medium text-muted hover:text-ink transition"
              >
                ← {language === "hi" ? "बदलाव समीक्षा पर वापस जाएं" : "Back to update review"}
              </button>
            </div>

          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · Longitudinal Consultation Intake
      </footer>
    </div>
  );
}
