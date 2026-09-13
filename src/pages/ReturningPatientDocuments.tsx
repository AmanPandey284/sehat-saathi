import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import DocumentUpload from "../features/documents/DocumentUpload";
import { useLanguage } from "../i18n/LanguageContext";
import { usePatientSession } from "../features/patient/state/PatientSessionContext";
import {
  loadReturningSession,
  saveReturningSession,
  type ReturningPatientSession,
} from "../features/patient/returningPatientModel";

export default function ReturningPatientDocuments() {
  const nav = useNavigate();
  const { language } = useLanguage();
  const session = usePatientSession();
  const [sessionData, setSessionData] = useState<ReturningPatientSession | null>(null);

  // Patient verification of extracted items
  const [verifications, setVerifications] = useState<
    Record<string, "confirmed" | "rejected" | "edited">
  >({});

  useEffect(() => {
    const s = loadReturningSession();
    if (!s || !s.previousRecord) {
      nav("/patient/lookup", { replace: true });
      return;
    }
    setSessionData(s);
  }, [nav]);

  if (!sessionData) return null;

  // Find all extracted entities across newly uploaded documents
  const allExtractedEntities = session.documents.flatMap((doc) =>
    (doc.entities || []).map((e) => ({
      ...e,
      docName: doc.name,
      uniqueKey: `${doc.name}-${e.type}-${e.value}`,
    }))
  );

  const handleAction = (key: string, action: "confirmed" | "rejected" | "edited") => {
    setVerifications((prev) => ({ ...prev, [key]: action }));
  };

  const handleProceed = () => {
    const verifiedList = allExtractedEntities.map((item) => ({
      name: item.type,
      type: item.type,
      value: item.value,
      action: (verifications[item.uniqueKey] || "confirmed") as "confirm" | "edit" | "reject",
    }));

    const updated: ReturningPatientSession = {
      ...sessionData,
      changes: {
        ...sessionData.changes,
        newDocumentsCount: session.documents.length,
        patientVerifiedEntities: verifiedList,
      },
    };
    saveReturningSession(updated);
    nav("/patient/returning/changes");
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader showStatus={false} />
        <main className="mx-auto max-w-4xl px-6 pb-20 pt-8">
          
          <div className="rounded-3xl border border-clinic-100 bg-white/90 p-8 shadow-sm sm:p-10 glass-card">
            <div className="flex items-center justify-between">
              <div>
                <span className="rounded-full bg-clinic-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-clinic-700">
                  {language === "hi" ? "दस्तावेज व ओसीआर" : "Document-First Intake"}
                </span>
                <h1 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
                  {language === "hi" ? "नई रिपोर्ट या पर्चा अपलोड करें" : "Attach New Records"}
                </h1>
                <p className="mt-1 text-xs text-muted">
                  {language === "hi"
                    ? "मौजूदा ओसीआर पाइपलाइन का उपयोग करके हम पर्चे से दवाइयां और जांच परिणाम स्वतः पढ़ लेंगे।"
                    : "Upload photos or PDFs of new prescriptions or lab reports to extract information automatically."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => nav("/patient/returning")}
                className="text-xs font-medium text-muted hover:text-ink transition"
              >
                ← {language === "hi" ? "वापस" : "Back"}
              </button>
            </div>

            {/* Existing DocumentUpload Component Reused Unchanged */}
            <div className="mt-6">
              <DocumentUpload />
            </div>

            {/* Patient Verification Step (Phase 6) */}
            {allExtractedEntities.length > 0 && (
              <div className="mt-8 rounded-2xl border-2 border-clinic-500/30 bg-clinic-50/50 p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-ink">
                      {language === "hi" ? "पहचाने गए तथ्यों की पुष्टि करें" : "Patient Verification of Extracted Information"}
                    </h3>
                    <p className="text-xs text-muted">
                      {language === "hi"
                        ? "केवल आपके द्वारा स्वीकृत जानकारी ही आपके रिकॉर्ड में जोड़ी जाएगी।"
                        : "Only confirmed items will update your longitudinal baseline."}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-clinic-700 bg-clinic-100 px-2.5 py-1 rounded-full">
                    {allExtractedEntities.length} {language === "hi" ? "आइटम मिले" : "items found"}
                  </span>
                </div>

                <div className="space-y-2 mt-4">
                  {allExtractedEntities.map((item) => {
                    const currentStatus = verifications[item.uniqueKey] || "confirmed";
                    return (
                      <div
                        key={item.uniqueKey}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-clinic-100 bg-white p-3 shadow-2xs text-xs"
                      >
                        <div>
                          <span className="font-bold text-clinic-800 uppercase tracking-wider text-[10px] mr-2">
                            {item.type}:
                          </span>
                          <span className="font-medium text-ink">{item.value}</span>
                          <span className="block text-[10px] text-muted">
                            Source: {item.docName}
                          </span>
                        </div>

                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleAction(item.uniqueKey, "confirmed")}
                            className={`px-2.5 py-1 rounded-md font-semibold transition ${
                              currentStatus === "confirmed"
                                ? "bg-clinic-600 text-white"
                                : "bg-clinic-50 text-muted hover:text-ink"
                            }`}
                          >
                            ✓ {language === "hi" ? "स्वीकृत" : "Confirm"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAction(item.uniqueKey, "rejected")}
                            className={`px-2.5 py-1 rounded-md font-semibold transition ${
                              currentStatus === "rejected"
                                ? "bg-red-600 text-white"
                                : "bg-slate-100 text-muted hover:text-ink"
                            }`}
                          >
                            ✕ {language === "hi" ? "अस्वीकृत" : "Reject"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="mt-8 pt-6 border-t border-clinic-100 flex justify-between items-center">
              <button
                type="button"
                onClick={() => nav("/patient/returning/changes")}
                className="text-xs font-medium text-muted hover:text-ink transition"
              >
                {language === "hi" ? "दस्तावेज छोड़े और आगे बढ़ें" : "Skip document upload"} →
              </button>

              <button
                type="button"
                onClick={handleProceed}
                className="rounded-full bg-clinic-600 px-6 py-3 text-xs font-semibold text-white shadow-sm hover:bg-clinic-700 transition"
              >
                {language === "hi" ? "बदलाव समीक्षा पर जाएं" : "Continue to Update Review"} →
              </button>
            </div>

          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · Document-First Returning Patient Intake
      </footer>
    </div>
  );
}
