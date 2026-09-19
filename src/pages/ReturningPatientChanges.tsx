import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import VoiceInputButton from "../components/VoiceInputButton";
import { useLanguage } from "../i18n/LanguageContext";
import { usePatientSession } from "../features/patient/state/PatientSessionContext";
import {
  loadReturningSession,
  saveReturningSession,
  getKnownConditions,
  getKnownMedications,
  getKnownAllergies,
  parseNaturalLanguageChanges,
  type ReturningPatientSession,
} from "../features/patient/returningPatientModel";
import { detectUrgentComplaintText } from "../features/safety/safetyEngine";
import { calculateWorkflowDurations } from "../features/timing/timingUtils";

export default function ReturningPatientChanges() {
  const nav = useNavigate();
  const { language } = useLanguage();
  const session = usePatientSession();

  const [sessionData, setSessionData] = useState<ReturningPatientSession | null>(null);

  // States for changes
  const [followUpStatus, setFollowUpStatus] = useState<"better" | "worse" | "same" | "new_symptoms">("same");
  const [conditionStates, setConditionStates] = useState<Record<string, "unchanged" | "changed">>({});
  const [medStates, setMedStates] = useState<Record<string, "still_taking" | "stopped" | "changed">>({});
  const [allergiesCorrect, setAllergiesCorrect] = useState(true);
  const [allergiesUpdateText, setAllergiesUpdateText] = useState("");
  const [recentHospitalization, setRecentHospitalization] = useState(false);
  const [hospitalizationNote, setHospitalizationNote] = useState("");

  // Natural language notes
  const [naturalNote, setNaturalNote] = useState("");
  const [parsedItems, setParsedItems] = useState<Array<{ category: string; description: string; onset?: string }>>([]);
  const [parsedConfirmed, setParsedConfirmed] = useState(false);

  useEffect(() => {
    const s = loadReturningSession();
    if (!s || !s.previousRecord) {
      nav("/patient/lookup", { replace: true });
      return;
    }
    setSessionData(s);

    const startIso = s.changes.timestamps?.whatChangedStartedAt || new Date().toISOString();
    session.updateTimestamps({ whatChangedStartedAt: startIso });

    // Initialize conditions
    const conds = getKnownConditions(s.previousRecord);
    const condInit: Record<string, "unchanged" | "changed"> = {};
    conds.forEach((c) => (condInit[c] = "unchanged"));
    setConditionStates(condInit);

    // Initialize meds
    const meds = getKnownMedications(s.previousRecord);
    const medInit: Record<string, "still_taking" | "stopped" | "changed"> = {};
    meds.forEach((m) => (medInit[m] = "still_taking"));
    setMedStates(medInit);

    if (s.changes.followUpStatus) {
      setFollowUpStatus(s.changes.followUpStatus);
    }
  }, [nav]);

  if (!sessionData) return null;

  const { previousRecord, changes } = sessionData;
  const isFollowUp = changes.visitReason === "follow_up";
  const knownConditions = getKnownConditions(previousRecord);
  const knownMeds = getKnownMedications(previousRecord);
  const knownAllergies = getKnownAllergies(previousRecord);

  const handleNaturalNoteChange = (text: string) => {
    setNaturalNote(text);
    const parsed = parseNaturalLanguageChanges(text);
    setParsedItems(parsed);
    setParsedConfirmed(false);
  };

  // Master quick-action: "Nothing has changed"
  const handleNothingChangedMaster = () => {
    const condInit: Record<string, "unchanged" | "changed"> = {};
    knownConditions.forEach((c) => (condInit[c] = "unchanged"));
    setConditionStates(condInit);

    const medInit: Record<string, "still_taking" | "stopped" | "changed"> = {};
    knownMeds.forEach((m) => (medInit[m] = "still_taking"));
    setMedStates(medInit);

    setAllergiesCorrect(true);
    setRecentHospitalization(false);

    commitAndProceed({
      unchangedConditions: knownConditions,
      changedConditions: [],
      unchangedMedications: knownMeds,
      changedMedications: [],
      allergiesStatus: "unchanged",
      hospitalizationSinceLastVisit: false,
    });
  };

  const commitAndProceed = (customChanges?: Partial<ReturningPatientSession["changes"]>) => {
    // Check safety if natural note contains urgent symptoms
    if (naturalNote.trim()) {
      const urgentFlag = detectUrgentComplaintText(naturalNote);
      if (urgentFlag) {
        session.setSafetyFlags([urgentFlag]);
        nav("/patient/emergency");
        return;
      }
    }

    // Build lists
    const unchangedConds = Object.entries(conditionStates)
      .filter(([_, st]) => st === "unchanged")
      .map(([c]) => c);
    const changedConds = Object.entries(conditionStates)
      .filter(([_, st]) => st === "changed")
      .map(([c]) => ({ name: c, status: "Patient reported change" }));

    const unchangedM = Object.entries(medStates)
      .filter(([_, st]) => st === "still_taking")
      .map(([m]) => m);
    const changedM = Object.entries(medStates)
      .filter(([_, st]) => st !== "still_taking")
      .map(([m, st]) => ({
        name: m,
        status: st === "stopped" ? ("stopped" as const) : ("changed" as const),
      }));

    const nowIso = new Date().toISOString();
    const retTimestamps = {
      ...(sessionData.changes.timestamps || {}),
      ...(session.timestamps || {}),
      whatChangedStartedAt: session.timestamps.whatChangedStartedAt || sessionData.changes.timestamps?.whatChangedStartedAt || nowIso,
      whatChangedCompletedAt: nowIso,
    };
    const retDurations = calculateWorkflowDurations(retTimestamps);
    session.updateTimestamps(retTimestamps);

    const updatedSession: ReturningPatientSession = {
      ...sessionData,
      changes: {
        ...sessionData.changes,
        followUpStatus: isFollowUp ? followUpStatus : undefined,
        unchangedConditions: customChanges?.unchangedConditions ?? unchangedConds,
        changedConditions: customChanges?.changedConditions ?? changedConds,
        unchangedMedications: customChanges?.unchangedMedications ?? unchangedM,
        changedMedications: customChanges?.changedMedications ?? changedM,
        allergiesStatus: allergiesCorrect ? "unchanged" : "updated",
        allergiesNote: allergiesCorrect ? knownAllergies : allergiesUpdateText,
        hospitalizationSinceLastVisit: recentHospitalization,
        hospitalizationDetails: recentHospitalization ? hospitalizationNote : undefined,
        naturalLanguageUpdate: naturalNote.trim() || undefined,
        structuredChanges: parsedItems.length > 0 ? parsedItems : undefined,
        timestamps: retTimestamps,
        durations: retDurations,
      },
    };

    saveReturningSession(updatedSession);

    // Route to next appropriate step:
    // SAFETY RULE: Quick Pass and returning flows MUST pass through safety screening
    if (changes.visitReason === "new_concern") {
      // Direct into chief complaint flow for new symptom
      nav("/patient");
    } else {
      // Mandatory rapid red-flag / safety screening gate before physician queue
      nav("/patient/returning/safety");
    }
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader showStatus={false} />
        <main className="mx-auto max-w-3xl px-6 pb-20 pt-8">
          <div className="rounded-3xl border border-clinic-100 bg-white/90 p-8 shadow-sm sm:p-10 glass-card">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="rounded-full bg-clinic-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-clinic-700">
                  {language === "hi" ? "चरण 2 · क्या कोई बदलाव हुआ?" : "Step 2 · What Has Changed?"}
                </span>
                <h1 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
                  {language === "hi" ? "पहले से दर्ज जानकारी की समीक्षा" : "Here's what we already know"}
                </h1>
                <p className="mt-1 text-xs text-muted">
                  {language === "hi"
                    ? "जो जानकारी सही है उसे दोबारा टाइप करने की आवश्यकता नहीं है।"
                    : "Confirm what is unchanged. Update only what is different."}
                </p>
              </div>

              {/* Master 1-Click Fast Pass */}
              <button
                type="button"
                onClick={handleNothingChangedMaster}
                className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-clinic-50 border border-clinic-300 px-4 py-2 text-xs font-bold text-clinic-800 hover:bg-clinic-100 hover:border-clinic-400 transition shadow-2xs"
              >
                <span>⚡</span>
                <span>{language === "hi" ? "कुछ नहीं बदला (त्वरित पुष्टि)" : "Nothing Changed (Quick Pass)"}</span>
              </button>
            </div>

            {/* Follow-up Specific Question (Phase 9) */}
            {isFollowUp && (
              <div className="mt-6 rounded-2xl border-2 border-clinic-500/30 bg-clinic-50/50 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-clinic-700">
                    {language === "hi" ? "फॉलो-अप स्थिति" : "Follow-Up Comparison"}
                  </span>
                  <span className="text-xs text-muted">
                    {previousRecord.chiefComplaint?.displayName}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-base font-semibold text-ink">
                  {language === "hi"
                    ? "पिछली यात्रा की तुलना में यह समस्या कैसी है?"
                    : "How is this problem compared with your previous visit?"}
                </h3>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: "better", labelEn: "Better", labelHi: "बेहतर / आराम है" },
                      { id: "same", labelEn: "About the same", labelHi: "वैसा ही है" },
                      { id: "worse", labelEn: "Worse", labelHi: "बढ़ गया है" },
                      { id: "new_symptoms", labelEn: "New symptoms", labelHi: "नए लक्षण हैं" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFollowUpStatus(opt.id)}
                      className={`rounded-xl py-2.5 px-3 text-xs font-semibold border transition ${
                        followUpStatus === opt.id
                          ? "bg-clinic-600 text-white border-clinic-600 shadow-xs"
                          : "bg-white text-ink border-clinic-200 hover:border-clinic-300"
                      }`}
                    >
                      {language === "hi" ? opt.labelHi : opt.labelEn}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile Fast-Pass Button */}
            <div className="mt-4 sm:hidden">
              <button
                type="button"
                onClick={handleNothingChangedMaster}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-clinic-50 border border-clinic-300 px-4 py-3 text-xs font-bold text-clinic-800 shadow-2xs"
              >
                <span>⚡</span>
                <span>{language === "hi" ? "कुछ नहीं बदला (त्वरित पुष्टि)" : "Nothing Changed (Quick Pass)"}</span>
              </button>
            </div>

            {/* 1. Known Conditions */}
            <div className="mt-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                {language === "hi" ? "1. पुरानी बीमारियां / स्थितियां" : "1. Known Medical Conditions"}
              </h3>
              {knownConditions.map((cond) => (
                <div
                  key={cond}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-clinic-100 bg-white p-3.5 shadow-2xs"
                >
                  <span className="font-semibold text-sm text-ink">{cond}</span>
                  <div className="flex gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setConditionStates((prev) => ({ ...prev, [cond]: "unchanged" }))
                      }
                      className={`px-3 py-1.5 rounded-lg font-medium transition ${
                        conditionStates[cond] === "unchanged"
                          ? "bg-clinic-600 text-white"
                          : "bg-clinic-50 text-muted hover:text-ink"
                      }`}
                    >
                      {language === "hi" ? "कोई बदलाव नहीं" : "No change"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConditionStates((prev) => ({ ...prev, [cond]: "changed" }))
                      }
                      className={`px-3 py-1.5 rounded-lg font-medium transition ${
                        conditionStates[cond] === "changed"
                          ? "bg-amber-600 text-white"
                          : "bg-slate-100 text-muted hover:text-ink"
                      }`}
                    >
                      {language === "hi" ? "बदलाव हुआ" : "Changed"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. Active Medications */}
            <div className="mt-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                {language === "hi" ? "2. वर्तमान दवाइयां" : "2. Known Medications"}
              </h3>
              {knownMeds.map((med) => (
                <div
                  key={med}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-clinic-100 bg-white p-3.5 shadow-2xs"
                >
                  <span className="font-semibold text-sm text-ink">{med}</span>
                  <div className="flex gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setMedStates((prev) => ({ ...prev, [med]: "still_taking" }))
                      }
                      className={`px-3 py-1.5 rounded-lg font-medium transition ${
                        medStates[med] === "still_taking"
                          ? "bg-clinic-600 text-white"
                          : "bg-clinic-50 text-muted hover:text-ink"
                      }`}
                    >
                      {language === "hi" ? "चल रही है" : "Still taking"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setMedStates((prev) => ({ ...prev, [med]: "stopped" }))
                      }
                      className={`px-3 py-1.5 rounded-lg font-medium transition ${
                        medStates[med] === "stopped"
                          ? "bg-red-600 text-white"
                          : "bg-slate-100 text-muted hover:text-ink"
                      }`}
                    >
                      {language === "hi" ? "बंद कर दी" : "Stopped"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setMedStates((prev) => ({ ...prev, [med]: "changed" }))
                      }
                      className={`px-3 py-1.5 rounded-lg font-medium transition ${
                        medStates[med] === "changed"
                          ? "bg-amber-600 text-white"
                          : "bg-slate-100 text-muted hover:text-ink"
                      }`}
                    >
                      {language === "hi" ? "खुराक बदली" : "Changed"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 3. Allergies */}
            <div className="mt-6 rounded-xl border border-clinic-100 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                    {language === "hi" ? "3. ज्ञात एलर्जी" : "3. Drug & Food Allergies"}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-ink">{knownAllergies}</p>
                </div>
                <div className="flex gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setAllergiesCorrect(true)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      allergiesCorrect
                        ? "bg-clinic-600 text-white"
                        : "bg-clinic-50 text-muted hover:text-ink"
                    }`}
                  >
                    {language === "hi" ? "सही है" : "Still correct"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllergiesCorrect(false)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      !allergiesCorrect
                        ? "bg-amber-600 text-white"
                        : "bg-slate-100 text-muted hover:text-ink"
                    }`}
                  >
                    {language === "hi" ? "अपडेट करें" : "Update"}
                  </button>
                </div>
              </div>

              {!allergiesCorrect && (
                <input
                  type="text"
                  value={allergiesUpdateText}
                  onChange={(e) => setAllergiesUpdateText(e.target.value)}
                  placeholder={
                    language === "hi"
                      ? "नई एलर्जी का विवरण दें (उदा. पेनिसिलिन से चकत्ते)"
                      : "Describe new allergy (e.g. rash with penicillin)"
                  }
                  className="mt-3 w-full rounded-lg border border-clinic-200 p-2.5 text-xs text-ink focus:border-clinic-500 focus:outline-hidden"
                />
              )}
            </div>

            {/* 4. Recent Hospitalization / Surgery */}
            <div className="mt-6 rounded-xl border border-clinic-100 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                    {language === "hi" ? "4. हालिया अस्पताल भर्ती या सर्जरी" : "4. Recent Hospitalization or Surgery"}
                  </h3>
                  <p className="mt-1 text-sm text-ink">
                    {language === "hi"
                      ? "पिछली मुलाकात के बाद क्या आप अस्पताल में भर्ती हुए?"
                      : "Any hospitalization or major procedure since last consultation?"}
                  </p>
                </div>
                <div className="flex gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setRecentHospitalization(false)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      !recentHospitalization
                        ? "bg-clinic-600 text-white"
                        : "bg-clinic-50 text-muted hover:text-ink"
                    }`}
                  >
                    {language === "hi" ? "नहीं" : "No"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecentHospitalization(true)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      recentHospitalization
                        ? "bg-amber-600 text-white"
                        : "bg-slate-100 text-muted hover:text-ink"
                    }`}
                  >
                    {language === "hi" ? "हाँ" : "Yes"}
                  </button>
                </div>
              </div>

              {recentHospitalization && (
                <input
                  type="text"
                  value={hospitalizationNote}
                  onChange={(e) => setHospitalizationNote(e.target.value)}
                  placeholder={
                    language === "hi"
                      ? "अस्पताल में भर्ती होने का कारण या विवरण लिखें"
                      : "Reason or procedure (e.g. Laparoscopic surgery last month)"
                  }
                  className="mt-3 w-full rounded-lg border border-clinic-200 p-2.5 text-xs text-ink focus:border-clinic-500 focus:outline-hidden"
                />
              )}
            </div>

            {/* 5. Natural Language "What Changed?" (Phase 7) */}
            <div className="mt-6 rounded-2xl border border-clinic-100 bg-clinic-50/50 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-clinic-700">
                  {language === "hi" ? "5. अपने शब्दों में बताएं (वैकल्पिक)" : "5. Tell Us What Changed (Natural Language)"}
                </span>
                <VoiceInputButton
                  onTranscript={(text) => {
                    const combined = naturalNote ? `${naturalNote} ${text}` : text;
                    handleNaturalNoteChange(combined);
                  }}
                  language={language}
                />
              </div>

              <textarea
                rows={3}
                value={naturalNote}
                onChange={(e) => handleNaturalNoteChange(e.target.value)}
                placeholder={
                  language === "hi"
                    ? "उदा. डॉक्टर द्वारा बीपी की गोली बदलने के बाद से मुझे 2 हफ्तों से चक्कर आ रहे हैं..."
                    : "e.g. I've been getting dizzy for 2 weeks since my doctor changed my BP medicine..."
                }
                className="w-full rounded-xl border border-clinic-200 bg-white p-3 text-xs text-ink placeholder:text-muted/60 focus:border-clinic-500 focus:outline-hidden focus:ring-1 focus:ring-clinic-200"
              />

              {/* Structured Extraction Preview (Phase 7) */}
              {parsedItems.length > 0 && (
                <div className="mt-3 rounded-xl border border-clinic-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-clinic-700">
                      {language === "hi" ? "हम इसे इस प्रकार समझे:" : "We understood this as:"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setParsedConfirmed(!parsedConfirmed)}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition ${
                        parsedConfirmed
                          ? "bg-clinic-100 text-clinic-800"
                          : "bg-clinic-50 text-clinic-600 hover:bg-clinic-100"
                      }`}
                    >
                      {parsedConfirmed
                        ? language === "hi" ? "✓ सत्यापित" : "✓ Confirmed"
                        : language === "hi" ? "पुष्टि करें" : "Confirm interpretation"}
                    </button>
                  </div>

                  <ul className="mt-2 space-y-1 text-xs text-ink">
                    {parsedItems.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-clinic-500" />
                        <span className="font-semibold text-clinic-800">{item.category}:</span>
                        <span>{item.description}</span>
                        {item.onset && (
                          <span className="text-[11px] text-muted">({item.onset})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 border-t border-clinic-100 pt-6">
              <button
                type="button"
                onClick={() => nav("/patient/returning")}
                className="text-xs font-medium text-muted hover:text-ink transition"
              >
                ← {language === "hi" ? "वापस जाएं" : "Back"}
              </button>

              <button
                type="button"
                onClick={() => commitAndProceed()}
                className="w-full sm:w-auto rounded-full bg-clinic-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-clinic-700 transition"
              >
                {language === "hi" ? "सत्यापित करें और आगे बढ़ें" : "Save Changes & Continue"} →
              </button>
            </div>

          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · Zero-Repetition Patient Record Engine
      </footer>
    </div>
  );
}
