import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { useLanguage } from "../i18n/LanguageContext";
import {
  loadReturningSession,
  saveReturningSession,
  getKnownConditions,
  getKnownMedications,
  getKnownAllergies,
  type VisitReason,
  type ReturningPatientSession,
} from "../features/patient/returningPatientModel";

export default function ReturningPatientHome() {
  const nav = useNavigate();
  const { language } = useLanguage();
  const [sessionData, setSessionData] = useState<ReturningPatientSession | null>(null);

  useEffect(() => {
    const session = loadReturningSession();
    if (!session || !session.previousRecord) {
      nav("/patient/lookup", { replace: true });
      return;
    }
    setSessionData(session);
  }, [nav]);

  if (!sessionData) return null;

  const { previousRecord } = sessionData;
  const profile = previousRecord.patientProfile;
  const knownConditions = getKnownConditions(previousRecord);
  const knownMeds = getKnownMedications(previousRecord);
  const knownAllergies = getKnownAllergies(previousRecord);

  const formattedDate = previousRecord.submittedAt
    ? new Date(previousRecord.submittedAt).toLocaleDateString(
        language === "hi" ? "hi-IN" : "en-IN",
        { day: "numeric", month: "short", year: "numeric" }
      )
    : "Previous Visit";

  const handleSelectReason = (reason: VisitReason, label: string) => {
    const updated: ReturningPatientSession = {
      ...sessionData,
      changes: {
        ...sessionData.changes,
        visitReason: reason,
        visitReasonLabel: label,
      },
    };
    saveReturningSession(updated);

    if (reason === "new_reports") {
      nav("/patient/returning/documents");
    } else {
      nav("/patient/returning/changes");
    }
  };

  const reasonOptions: Array<{
    reason: VisitReason;
    titleEn: string;
    titleHi: string;
    descEn: string;
    descHi: string;
    icon: string;
    badge?: string;
  }> = [
    {
      reason: "follow_up",
      titleEn: "Follow-up",
      titleHi: "फॉलो-अप परामर्श",
      descEn: `Continue care related to ${previousRecord.chiefComplaint?.displayName || "previous visit"}.`,
      descHi: `पिछली समस्या (${previousRecord.chiefComplaint?.displayName || "पिछली जांच"}) से संबंधित परामर्श जारी रखें।`,
      icon: "🩺",
      badge: language === "hi" ? "त्वरित अपडेट" : "Fast-Track",
    },
    {
      reason: "new_concern",
      titleEn: "New health concern",
      titleHi: "नई स्वास्थ्य समस्या",
      descEn: "I have a different symptom or problem today.",
      descHi: "आज मुझे कोई अलग लक्षण या समस्या है।",
      icon: "⚡",
    },
    {
      reason: "medication_update",
      titleEn: "Medication or treatment update",
      titleHi: "दवा या उपचार में बदलाव",
      descEn: "My medicines, dosage, or treatments have changed.",
      descHi: "मेरी दवाइयों या खुराक में कोई बदलाव हुआ है।",
      icon: "💊",
    },
    {
      reason: "new_reports",
      titleEn: "New reports or prescription",
      titleHi: "नई जांच रिपोर्ट या पर्चा",
      descEn: "I have new medical documents or lab tests to attach.",
      descHi: "मेरे पास नई लैब रिपोर्ट या डॉक्टर का पर्चा है।",
      icon: "📄",
    },
    {
      reason: "other",
      titleEn: "Something else",
      titleHi: "अन्य कारण",
      descEn: "Tell us in your own words what you need help with.",
      descHi: "अपने शब्दों में बताएं कि आपको क्या सहायता चाहिए।",
      icon: "💬",
    },
  ];

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader showStatus={false} />
        <main className="mx-auto max-w-4xl px-6 pb-20 pt-8">
          
          {/* Welcome Header */}
          <div className="rounded-3xl border border-clinic-100 bg-white/90 p-8 shadow-sm sm:p-10 glass-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="rounded-full bg-clinic-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-clinic-700">
                  {language === "hi" ? "पहचाना गया मरीज" : "Verified Patient Record"}
                </span>
                <h1 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
                  {language === "hi"
                    ? `वापसी पर स्वागत है, ${profile.name}`
                    : `Welcome back, ${profile.name}`}
                </h1>
                <p className="mt-1 text-xs text-muted">
                  {language === "hi"
                    ? `अंतिम परामर्श: ${formattedDate} · आईडी: ${profile.identifier}`
                    : `Last consultation: ${formattedDate} · Record ID: ${profile.identifier}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => nav("/patient/lookup")}
                className="rounded-xl border border-clinic-200 px-3.5 py-1.5 text-xs font-medium text-muted hover:border-clinic-400 hover:text-ink transition"
              >
                {language === "hi" ? "मरीज बदलें" : "Switch Patient"}
              </button>
            </div>

            {/* Patient Snapshot Card */}
            <div className="mt-6 rounded-2xl border border-clinic-100 bg-clinic-50/40 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-clinic-700 mb-3">
                {language === "hi" ? "📋 आपका स्वास्थ्य सारांश (पहले से दर्ज)" : "📋 Patient Baseline Snapshot"}
              </p>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                <div className="rounded-xl bg-white p-3 border border-clinic-100/80 shadow-2xs">
                  <span className="text-[11px] font-medium text-muted uppercase">
                    {language === "hi" ? "आयु / लिंग" : "Age / Sex"}
                  </span>
                  <p className="mt-0.5 text-sm font-semibold text-ink">
                    {profile.age} yrs · {profile.sex}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3 border border-clinic-100/80 shadow-2xs">
                  <span className="text-[11px] font-medium text-muted uppercase">
                    {language === "hi" ? "ज्ञात स्थितियां" : "Known Conditions"}
                  </span>
                  <p className="mt-0.5 text-xs font-semibold text-ink line-clamp-2">
                    {knownConditions.join(", ")}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3 border border-clinic-100/80 shadow-2xs">
                  <span className="text-[11px] font-medium text-muted uppercase">
                    {language === "hi" ? "दवाइयां" : "Active Meds"}
                  </span>
                  <p className="mt-0.5 text-xs font-semibold text-ink line-clamp-2">
                    {knownMeds.join(", ")}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3 border border-clinic-100/80 shadow-2xs">
                  <span className="text-[11px] font-medium text-muted uppercase">
                    {language === "hi" ? "एलर्जी" : "Allergies"}
                  </span>
                  <p className="mt-0.5 text-xs font-semibold text-ink line-clamp-2">
                    {knownAllergies}
                  </p>
                </div>
              </div>
            </div>

            {/* What Brings You In Today? */}
            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold text-ink">
                {language === "hi" ? "आज आपके आने का क्या कारण है?" : "What brings you in today?"}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {language === "hi"
                  ? "विकल्प चुनें। हम केवल वही पूछेंगे जो आज के लिए आवश्यक है।"
                  : "Choose an option below. We will only ask what is relevant for today's visit."}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {reasonOptions.map((opt) => (
                  <button
                    key={opt.reason}
                    type="button"
                    onClick={() =>
                      handleSelectReason(
                        opt.reason,
                        language === "hi" ? opt.titleHi : opt.titleEn
                      )
                    }
                    className="group relative flex items-start gap-4 rounded-2xl border-2 border-clinic-100 bg-white p-4.5 text-left transition-all hover:border-clinic-500 hover:shadow-xs"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-clinic-50 text-2xl group-hover:bg-clinic-100 transition">
                      {opt.icon}
                    </span>

                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-ink group-hover:text-clinic-700 transition">
                          {language === "hi" ? opt.titleHi : opt.titleEn}
                        </span>
                        {opt.badge && (
                          <span className="rounded-full bg-clinic-100 px-2 py-0.5 text-[10px] font-bold text-clinic-700">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted leading-relaxed">
                        {language === "hi" ? opt.descHi : opt.descEn}
                      </p>
                    </div>

                    <span className="absolute right-4 top-5 text-clinic-400 group-hover:text-clinic-600 transition" aria-hidden>
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · Zero-Repetition Patient Portal
      </footer>
    </div>
  );
}
