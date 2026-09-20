import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import VoiceInputButton from "../components/VoiceInputButton";
import { useLanguage } from "../i18n/LanguageContext";
import { usePatientSession } from "../features/patient/state/PatientSessionContext";
import {
  loadReturningSession,
  saveReturningSession,
  type ReturningPatientSession,
} from "../features/patient/returningPatientModel";
import {
  evaluateSafety,
  detectUrgentComplaintText,
} from "../features/safety/safetyEngine";

interface RedFlagItem {
  key: string;
  labelEn: string;
  labelHi: string;
  descEn: string;
  descHi: string;
  field: string;
}

const RED_FLAG_ITEMS: RedFlagItem[] = [
  {
    key: "breathingDifficulty",
    labelEn: "Difficulty Breathing / Breathlessness",
    labelHi: "सांस लेने में गंभीर कठिनाई या दम फूलना",
    descEn: "Struggling to breathe, inability to speak in full sentences, or severe wheezing.",
    descHi: "सांस फूलना, बोलने में दिक्कत या बहुत तेज सांस चलना।",
    field: "breathingDifficulty",
  },
  {
    key: "chestPain",
    labelEn: "Severe Chest Pain or Pressure",
    labelHi: "सीने में तेज दर्द या भारीपन",
    descEn: "Crushing chest pain, pressure radiating to jaw, neck, back, or left arm.",
    descHi: "सीने में असहनीय दबाव, दर्द जो बांह, गर्दन या जबड़े तक फैले।",
    field: "chestPain",
  },
  {
    key: "bloodInCough",
    labelEn: "Coughing up Blood (Hemoptysis)",
    labelHi: "खांसी में खून आना",
    descEn: "Fresh blood or dark blood clots mixed in cough or phlegm.",
    descHi: "खांसी या बलगम के साथ ताजा खून या थक्के आना।",
    field: "bloodInCough",
  },
  {
    key: "bloodInStool",
    labelEn: "Blood in Stool or Vomit",
    labelHi: "मल या उल्टी में खून आना",
    descEn: "Black tarry stool, visible red blood in bowel movement, or vomiting blood.",
    descHi: "काले रंग का मल, शौच में खून, या खून की उल्टी।",
    field: "bloodInStool",
  },
  {
    key: "vomiting",
    labelEn: "Persistent Vomiting / Inability to Keep Fluids",
    labelHi: "लगातार उल्टी / पानी भी न पच पाना",
    descEn: "Unable to keep any liquids down, showing severe dehydration.",
    descHi: "पानी या तरल पदार्थ भी पेट में न रुकना, अत्यधिक कमजोरी।",
    field: "vomiting",
  },
  {
    key: "severePain",
    labelEn: "Sudden Severe Incapacitating Pain",
    labelHi: "अचानक बहुत तेज असहनीय दर्द (8-10 स्तर)",
    descEn: "Excruciating acute abdominal, head, or body pain (severity 8 or higher).",
    descHi: "अचानक शुरू हुआ बहुत तेज दर्द जो बर्दाश्त से बाहर हो।",
    field: "severity",
  },
];

export default function ReturningPatientSafety() {
  const nav = useNavigate();
  const { language } = useLanguage();
  const session = usePatientSession();

  const [sessionData, setSessionData] = useState<ReturningPatientSession | null>(null);
  const [selectedFlags, setSelectedFlags] = useState<Record<string, boolean>>({});
  const [symptomText, setSymptomText] = useState("");

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
  const isFollowUp = changes.visitReason === "follow_up";
  const complaintTitle = isFollowUp
    ? previousRecord.chiefComplaint?.displayName || "Previous Consultation"
    : changes.visitReasonLabel;

  const toggleFlag = (key: string) => {
    setSelectedFlags((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleRunSafetyCheck = () => {
    // 1. Check free text first using existing detectUrgentComplaintText
    if (symptomText.trim()) {
      const textUrgent = detectUrgentComplaintText(symptomText);
      if (textUrgent) {
        session.setSafetyFlags([textUrgent]);
        nav("/patient/emergency");
        return;
      }
    }

    // 2. Build temporary evaluation payload for evaluateSafety() ONLY
    const evalPayload: Record<string, string | boolean | number> = {
      breathingDifficulty: selectedFlags.breathingDifficulty ? "yes" : "no",
      chestPain: selectedFlags.chestPain ? "yes" : "no",
      bloodInCough: selectedFlags.bloodInCough ? "yes" : "no",
      bloodInStool: selectedFlags.bloodInStool ? "yes" : "no",
      vomiting: selectedFlags.vomiting ? "yes" : "no",
      keepingFluidsDown: selectedFlags.vomiting ? "no" : "yes",
      severity: selectedFlags.severePain ? 9 : 2,
    };

    const triggeredFlags = evaluateSafety(evalPayload);
    const urgentFlag = triggeredFlags.find((f) => f.severity === "urgent");

    if (urgentFlag) {
      // Emergency routing — red flag triggered!
      session.setSafetyFlags(triggeredFlags);
      nav("/patient/emergency");
      return;
    }

    // 3. Passed safety screening — record safety clearance and ONLY explicitly selected symptoms.
    // Do NOT persist synthetic keepingFluidsDown, severity: 2, or unselected items as "no".
    const confirmedSafetyAnswers: Record<string, string | boolean | number> = {
      safety_screened: true,
      safety_screened_at: new Date().toISOString(),
    };
    if (selectedFlags.breathingDifficulty) confirmedSafetyAnswers.breathingDifficulty = "yes";
    if (selectedFlags.chestPain) confirmedSafetyAnswers.chestPain = "yes";
    if (selectedFlags.bloodInCough) confirmedSafetyAnswers.bloodInCough = "yes";
    if (selectedFlags.bloodInStool) confirmedSafetyAnswers.bloodInStool = "yes";
    if (selectedFlags.vomiting) confirmedSafetyAnswers.vomiting = "yes";
    if (selectedFlags.severePain) confirmedSafetyAnswers.severePain = "yes";

    session.setHistoryAnswers({
      ...(session.historyAnswers || {}),
      ...confirmedSafetyAnswers,
    });

    // Ensure session has today's visit context / chief complaint set
    session.setChiefComplaint({
      complaintId: previousRecord.chiefComplaint?.complaintId || "custom",
      displayName: `Follow-up: ${complaintTitle}`,
      originalInput:
        changes.naturalLanguageUpdate ||
        `${changes.visitReasonLabel} - Follow-up status: ${changes.followUpStatus || "same"}`,
      confidence: 1.0,
      source: "patient",
    });

    // Save state into returning session
    const updated = {
      ...sessionData,
      changes: {
        ...sessionData.changes,
        safetyScreened: true,
      },
    };
    saveReturningSession(updated);

    // Proceed to returning options
    nav("/patient/returning/options");
  };

  const handleConfirmNoRedFlags = () => {
    // Rapid 1-click confirmation that no red flags are present
    setSelectedFlags({});
    
    // Check if symptom text has any urgent flags
    if (symptomText.trim()) {
      const textUrgent = detectUrgentComplaintText(symptomText);
      if (textUrgent) {
        session.setSafetyFlags([textUrgent]);
        nav("/patient/emergency");
        return;
      }
    }

    // Record safety clearance without injecting synthetic keepingFluidsDown: "yes", severity: 2, or false "no" answers.
    session.setHistoryAnswers({
      ...(session.historyAnswers || {}),
      safety_screened: true,
      safety_screened_at: new Date().toISOString(),
    });

    session.setChiefComplaint({
      complaintId: previousRecord.chiefComplaint?.complaintId || "custom",
      displayName: `Follow-up: ${complaintTitle}`,
      originalInput:
        changes.naturalLanguageUpdate ||
        `${changes.visitReasonLabel} - Follow-up status: ${changes.followUpStatus || "same"}`,
      confidence: 1.0,
      source: "patient",
    });

    const updated = {
      ...sessionData,
      changes: {
        ...sessionData.changes,
        safetyScreened: true,
      },
    };
    saveReturningSession(updated);

    nav("/patient/returning/options");
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader showStatus={false} />
        <main className="mx-auto max-w-2xl px-6 pb-20 pt-8">
          <div className="rounded-3xl border border-clinic-100 bg-white/90 p-8 shadow-sm sm:p-10 glass-card">
            
            {/* Header Badge */}
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 text-lg" aria-hidden>
                🛡️
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  {language === "hi" ? "अनिवार्य सुरक्षा जांच" : "Mandatory Safety Screening"}
                </span>
                <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                  {language === "hi" ? "आज की स्वास्थ्य सुरक्षा पुष्टि" : "Today's Clinical Safety Check"}
                </h1>
              </div>
            </div>

            {/* Visit Context Card */}
            <div className="mt-5 rounded-2xl border border-clinic-200/80 bg-clinic-50/60 p-4.5 text-xs text-ink">
              <div className="flex items-center justify-between border-b border-clinic-200/50 pb-2">
                <span className="font-bold uppercase tracking-wider text-clinic-700">
                  {language === "hi" ? "आज के आने का संदर्भ" : "Today's Visit Context"}
                </span>
                <span className="rounded-full bg-clinic-100 px-2.5 py-0.5 font-semibold text-clinic-800">
                  {changes.visitReasonLabel}
                </span>
              </div>
              <p className="mt-2">
                <strong className="text-muted">{language === "hi" ? "पिछला मुख्य लक्षण:" : "Follow-up for:"}</strong>{" "}
                {complaintTitle}
              </p>
              {changes.followUpStatus && (
                <p className="mt-1">
                  <strong className="text-muted">{language === "hi" ? "स्थिति:" : "Status:"}</strong>{" "}
                  {changes.followUpStatus.toUpperCase()}
                </p>
              )}
            </div>

            <p className="mt-5 text-sm text-ink font-medium leading-relaxed">
              {language === "hi"
                ? "डॉक्टर कतार में भेजने से पहले, कृपया पुष्टि करें कि क्या आप नीचे दिए गए किसी भी आपातकालीन लक्षण का अनुभव कर रहे हैं:"
                : "Before connecting to the physician queue, please confirm whether you are experiencing any of these emergency red-flag symptoms today:"}
            </p>

            {/* Red Flag Checklist */}
            <div className="mt-4 space-y-2.5">
              {RED_FLAG_ITEMS.map((item) => {
                const isChecked = Boolean(selectedFlags[item.key]);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleFlag(item.key)}
                    className={`w-full flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                      isChecked
                        ? "border-red-400 bg-red-50/80 shadow-2xs"
                        : "border-clinic-100 bg-white hover:border-clinic-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-0.5 h-4 w-4 rounded-sm border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <div className="flex-1">
                      <p className={`text-xs font-semibold ${isChecked ? "text-red-900" : "text-ink"}`}>
                        {language === "hi" ? item.labelHi : item.labelEn}
                      </p>
                      <p className="text-[11px] text-muted mt-0.5 leading-tight">
                        {language === "hi" ? item.descHi : item.descEn}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Optional text or voice input */}
            <div className="mt-5 rounded-xl border border-clinic-100 bg-clinic-50/30 p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                  {language === "hi" ? "कोई अन्य गंभीर लक्षण? (वैकल्पिक)" : "Any other urgent complaint? (Optional)"}
                </span>
                <VoiceInputButton
                  onTranscript={(t) => setSymptomText((prev) => (prev ? `${prev} ${t}` : t))}
                  language={language}
                />
              </div>
              <input
                type="text"
                value={symptomText}
                onChange={(e) => setSymptomText(e.target.value)}
                placeholder={
                  language === "hi"
                    ? "उदा. सीने में तेज चुभन, चक्कर आना..."
                    : "e.g. sharp chest pain, sudden breathlessness..."
                }
                className="w-full rounded-lg border border-clinic-200 bg-white p-2.5 text-xs text-ink placeholder:text-muted/60 focus:border-clinic-500 focus:outline-hidden"
              />
            </div>

            {/* Actions */}
            <div className="mt-8 space-y-3">
              {/* Primary 1-Click Fast Gate: None of the above */}
              <button
                type="button"
                onClick={handleConfirmNoRedFlags}
                className="w-full flex items-center justify-between rounded-2xl bg-clinic-600 p-4 font-semibold text-white shadow-sm hover:bg-clinic-700 transition"
              >
                <div>
                  <p className="text-sm">
                    {language === "hi"
                      ? "✓ इनमें से कोई नहीं — स्थिति सामान्य है"
                      : "✓ None of the above — No emergency symptoms"}
                  </p>
                  <p className="text-xs font-normal text-clinic-100">
                    {language === "hi"
                      ? "सुरक्षा जांच पूरी करें और आगे बढ़ें"
                      : "Safety check cleared. Proceed to consultation options"}
                  </p>
                </div>
                <span className="text-lg">→</span>
              </button>

              {/* If any flag is checked, show explicit evaluation button */}
              {Object.values(selectedFlags).some(Boolean) && (
                <button
                  type="button"
                  onClick={handleRunSafetyCheck}
                  className="w-full rounded-xl bg-red-600 p-3.5 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition flex items-center justify-center gap-2"
                >
                  <span>⚠️</span>
                  <span>
                    {language === "hi"
                      ? "लक्षणों का मूल्यांकन करें (आपातकालीन ट्रायेज)"
                      : "Evaluate Selected Symptoms (Safety Triage)"}
                  </span>
                </button>
              )}

              {/* Alternative: If user has a new specific complaint needing the full Question Engine */}
              <button
                type="button"
                onClick={() => nav("/patient")}
                className="w-full rounded-xl border border-clinic-200 bg-white p-3 text-xs font-semibold text-ink hover:border-clinic-400 transition text-center"
              >
                {language === "hi"
                  ? "🩺 मुझे आज एक नया लक्षण बताना है (विस्तृत प्रश्नोत्तरी)"
                  : "🩺 I have a new symptom to report (Adaptive Question Engine)"}
              </button>
            </div>

            {/* Back link */}
            <div className="mt-6 pt-4 border-t border-clinic-100 text-center">
              <button
                type="button"
                onClick={() => nav("/patient/returning/changes")}
                className="text-xs font-medium text-muted hover:text-ink transition"
              >
                ← {language === "hi" ? "बदलाव समीक्षा पर वापस जाएं" : "Back to Changes Review"}
              </button>
            </div>

          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · Mandatory Clinical Safety Gate · Red-Flag Protocol
      </footer>
    </div>
  );
}
