import { Link, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { useLanguage } from "../i18n/LanguageContext";
import { usePatientSession } from "../features/patient/state/PatientSessionContext";

export default function PatientLanding() {
  const { t, language } = useLanguage();
  const { resetSession } = usePatientSession();
  const navigate = useNavigate();

  const startNewConsultation = () => {
    // A new patient/consultation must never inherit answers or uploaded
    // records from the previous consultation stored in browser state.
    resetSession();
    try {
      sessionStorage.removeItem("sehatSaathi_adaptive_analysis");
    } catch {}
    navigate("/patient/consent");
  };

  const workflowSteps = [
    {
      step: "01",
      title: language === "hi" ? "सहमति व पहचान" : "Consent & ID",
      desc: language === "hi" ? "सुरक्षित रोगी सहमति व डेमोग्राफिक्स" : "ABHA / Demographics with strict patient consent",
      icon: "🛡️"
    },
    {
      step: "02",
      title: language === "hi" ? "मुख्य समस्या" : "Chief Complaint",
      desc: language === "hi" ? "हिंदी, अंग्रेजी या आवाज में बताएं" : "Natural language or voice in Hindi & English",
      icon: "🗣️"
    },
    {
      step: "03",
      title: language === "hi" ? "अनुकूली इतिहास" : "Adaptive History",
      desc: language === "hi" ? "लक्षण-विशिष्ट अनुकूली क्लीनिकल प्रश्न" : "Condition-tailored dynamic clinical triage",
      icon: "🩺"
    },
    {
      step: "04",
      title: language === "hi" ? "दस्तावेज व ओसीआर" : "Documents & OCR",
      desc: language === "hi" ? "पुराने पर्चे व जांच रिपोर्ट का स्वचालित पाठ" : "Lab reports and prescription text extraction",
      icon: "📄"
    },
    {
      step: "05",
      title: language === "hi" ? "सुरक्षा व रेड-फ्लैग" : "Safety & Triage",
      desc: language === "hi" ? "गंभीर लक्षणों पर तत्काल क्लिनिकल अलर्ट" : "Immediate red-flag warnings for urgent cases",
      icon: "🚨"
    },
    {
      step: "06",
      title: language === "hi" ? "डॉक्टर समीक्षा" : "Doctor Review",
      desc: language === "hi" ? "पुष्टि, संशोधन व FHIR-रेडी एक्सपोर्ट" : "Physician review, corrections & FHIR export",
      icon: "👨‍⚕️"
    }
  ];

  const features = [
    {
      icon: "🧭",
      badge: "Clinical Engine",
      title: language === "hi" ? "अनुकूली क्लीनिकल इतिहास" : "Adaptive Clinical History",
      desc: language === "hi"
        ? "रोगी की मुख्य शिकायत के आधार पर निर्धारित शाखा-प्रवाह तथा अनुकूली प्रश्न जो अप्रासंगिक प्रश्नों को छोड़ते हैं।"
        : "Dynamic routing across 9 organ systems that branches intelligently and skips irrelevant routine questions."
    },
    {
      icon: "🎙️",
      badge: "Accessibility",
      title: language === "hi" ? "द्विभाषी आवाज इनपुट" : "Bilingual Voice Input",
      desc: language === "hi"
        ? "हिंदी और अंग्रेजी में प्राकृतिक बोलकर उत्तर देने की सुविधा, जो ग्रामीण व गैर-साक्षर रोगियों के लिए अनुकूल है।"
        : "Seamless voice recognition in Hindi & English designed for kiosks in rural and high-throughput OPDs."
    },
    {
      icon: "🚨",
      badge: "Safety First",
      title: language === "hi" ? "रेड-फ्लैग व सुरक्षा इंजन" : "Deterministic Red-Flag Safety",
      desc: language === "hi"
        ? "सीने में तेज दर्द या सांस की तकलीफ जैसे आपातकालीन लक्षणों पर तुरंत रूटीन रोककर आपात स्क्रीन।"
        : "Zero-latency triage rules that immediately halt routine intake upon detecting critical emergency symptoms."
    },
    {
      icon: "📄",
      badge: "Intelligence",
      title: language === "hi" ? "दस्तावेज़ ओसीआर निष्कर्षण" : "Document & Prescription OCR",
      desc: language === "hi"
        ? "पूर्व चिकित्सा पर्चे, दवाइयां और लैब जांच रिपोर्ट अपलोड कर संरचित डेटा और टाइमलाइन निर्माण।"
        : "Extracts clinical entities, medications, and labs from scanned records into an organized timeline."
    },
    {
      icon: "🩺",
      badge: "Physician Control",
      title: language === "hi" ? "डॉक्टर सत्यापन पोर्टल" : "Physician Review & Audit",
      desc: language === "hi"
        ? "डॉक्टर रोगी के मूल प्रमाण, टाइमलाइन और उत्तरों को आसानी से सत्यापित, संशोधित या अस्वीकार कर सकते हैं।"
        : "Empowers doctors with single-click confirmation, field edits, and complete evidence traceability."
    },
    {
      icon: "🌿",
      badge: "Integrative Health",
      title: language === "hi" ? "आयुष मोड" : "AYUSH Intake Mode",
      desc: language === "hi"
        ? "प्रकृति, विकृति, सार, संहनन, आहार-शक्ति जैसी पारंपरिक आयुर्वेदिक श्रेणियों का संरचित संकलन।"
        : "Dedicated capture of Prakriti, Sara, Ahara Shakti, and lifestyle factors for Ayurvedic clinical OPDs."
    },
    {
      icon: "🌐",
      badge: "Standards",
      title: language === "hi" ? "FHIR-रेडी एक्सपोर्ट" : "FHIR-Ready Interoperability",
      desc: language === "hi"
        ? "राष्ट्रीय डिजिटल स्वास्थ्य मिशन (ABDM) मानकों के अनुरूप एक क्लिक में मानकीकृत JSON एक्सपोर्ट।"
        : "One-click export conforming to FHIR Release 4 bundle standards ready for ABDM integration."
    },
    {
      icon: "🔒",
      badge: "Privacy",
      title: language === "hi" ? "पूर्ण डेटा गोपनीयता" : "Privacy & Strict Separation",
      desc: language === "hi"
        ? "नया रोगी सत्र शुरू होते ही पिछला डेटा पूरी तरह साफ; डॉक्टर और रोगी की सीमाएं कड़ाई से सुरक्षित।"
        : "Independent doctor/patient contexts; every new intake begins with clean zero-leakage state."
    }
  ];

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader showStatus={true} />

        <main className="mx-auto max-w-6xl px-6 pb-20 pt-6">
          {/* HERO SECTION */}
          <section className="relative overflow-hidden rounded-3xl border border-clinic-100 bg-white/80 p-8 shadow-sm sm:p-14 glass-card">
            <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-clinic-100/40 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-clinic-50/70 blur-2xl pointer-events-none" />

            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-clinic-200 bg-clinic-50/80 px-3.5 py-1.5 text-xs font-semibold text-clinic-800 shadow-xs">
                <span className="flex h-2 w-2 rounded-full bg-clinic-500 animate-pulse" />
                <span>Smart India Hackathon · SIH26047</span>
              </div>

              <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.15] text-ink sm:text-5xl lg:text-6xl tracking-tight">
                {language === "hi"
                  ? "अपनी परेशानी बताएं। डॉक्टर के लिए आपका इतिहास हम तैयार करेंगे।"
                  : t.landing.heading}
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
                {t.landing.subheading}
              </p>

              {/* POLISHED ENTRY CARDS */}
              <div className="mt-10 grid gap-4 sm:grid-cols-2 max-w-2xl">
                {/* Patient Portal Card */}
                <div className="relative group flex flex-col justify-between rounded-2xl border-2 border-clinic-500/20 bg-gradient-to-br from-white to-clinic-50/50 p-6 shadow-sm transition-all duration-200 hover:border-clinic-500 hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-clinic-600 text-white text-xl shadow-xs">
                        🙋
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-clinic-600">
                        {language === "hi" ? "रोगी प्रवेश" : "Patient Portal"}
                      </span>
                    </div>
                    <h2 className="mt-4 font-display text-xl font-semibold text-ink">
                      {language === "hi" ? "परामर्श पूर्व इतिहास दर्ज करें" : "Start Intake Consultation"}
                    </h2>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed">
                      {language === "hi"
                        ? "आवाज या टाइप करके अपनी समस्या बताएं, पुरानी जांच रिपोर्ट जोड़ें और संरचित सारांश पाएं।"
                        : "Share symptoms via voice or touch, attach past prescriptions, and prepare clinical history."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startNewConsultation}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-clinic-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-clinic-700 hover:shadow"
                  >
                    <span>{t.landing.startButton}</span>
                    <span aria-hidden>→</span>
                  </button>
                </div>

                {/* Doctor / Admin Portal Card */}
                <div className="relative group flex flex-col justify-between rounded-2xl border border-clinic-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-clinic-400 hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-clinic-800 text-xl border border-clinic-100">
                        🩺
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                        {language === "hi" ? "चिकित्सक पोर्टल" : "Clinical Portal"}
                      </span>
                    </div>
                    <h2 className="mt-4 font-display text-xl font-semibold text-ink">
                      {language === "hi" ? "डॉक्टर / क्लिनिकल समीक्षा" : "Physician Review Portal"}
                    </h2>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed">
                      {language === "hi"
                        ? "रोगी कतार देखें, प्राथमिकता वाले रेड-फ्लैग्स जांचें, प्रमाण सत्यापित करें व FHIR एक्सपोर्ट करें।"
                        : "Inspect patient queue, triage urgent safety flags, verify evidence, and export FHIR bundles."}
                    </p>
                  </div>
                  <Link
                    to="/doctor"
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-clinic-300 bg-clinic-50/60 px-6 py-3.5 text-base font-semibold text-clinic-800 transition hover:bg-clinic-100 hover:border-clinic-400"
                  >
                    <span>{t.landing.doctorButton}</span>
                    <span aria-hidden>🔒</span>
                  </Link>
                </div>
              </div>

              {/* Quick AYUSH Link */}
              <div className="mt-6 flex items-center gap-2 text-xs text-muted">
                <span>Looking for traditional Ayurveda intake?</span>
                <Link to="/patient/ayush" className="font-semibold text-clinic-700 underline decoration-clinic-300 underline-offset-4 hover:text-clinic-900">
                  Open AYUSH Mode →
                </Link>
              </div>
            </div>
          </section>

          {/* WORKFLOW PIPELINE */}
          <section className="mt-16" aria-labelledby="workflow-heading">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-clinic-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-clinic-600">
                  {language === "hi" ? "चरणबद्ध कार्यप्रवाह" : "End-to-End Workflow"}
                </p>
                <h2 id="workflow-heading" className="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">
                  {language === "hi" ? "रोगी से डॉक्टर तक की यात्रा" : "How Sehat Saathi Works"}
                </h2>
              </div>
              <span className="text-xs text-muted">6 Connected Clinical Steps</span>
            </div>

            <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {workflowSteps.map((s, idx) => (
                <li
                  key={s.step}
                  className="relative flex flex-col justify-between rounded-2xl border border-clinic-100 bg-white p-5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl" aria-hidden>{s.icon}</span>
                      <span className="font-display text-sm font-semibold text-clinic-400">
                        {s.step}
                      </span>
                    </div>
                    <p className="mt-3 font-semibold text-ink text-sm leading-snug">{s.title}</p>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed">{s.desc}</p>
                  </div>
                  {idx < workflowSteps.length - 1 && (
                    <div className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 text-clinic-300 text-xs font-bold pointer-events-none">
                      →
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {/* FEATURE SHOWCASE */}
          <section className="mt-16" aria-labelledby="features-heading">
            <div className="border-b border-clinic-100 pb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-clinic-600">
                {language === "hi" ? "वास्तविक तकनीकी क्षमताएं" : "Implemented Architecture"}
              </p>
              <h2 id="features-heading" className="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">
                {language === "hi" ? "मुख्य विशेषताएं" : "Core Capabilities"}
              </h2>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="flex flex-col justify-between rounded-2xl border border-clinic-100/90 bg-white p-6 shadow-xs transition hover:border-clinic-200 hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl" aria-hidden>{f.icon}</span>
                      <span className="rounded-full bg-clinic-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-clinic-700">
                        {f.badge}
                      </span>
                    </div>
                    <h3 className="mt-4 font-semibold text-ink text-base">{f.title}</h3>
                    <p className="mt-2 text-xs text-muted leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* PRIVACY & ETHICS STATEMENT */}
          <section
            className="mt-16 rounded-3xl border border-clinic-100 bg-white p-8 shadow-sm sm:p-10"
            aria-labelledby="privacy-heading"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-clinic-50 text-xl" aria-hidden>
                🔒
              </span>
              <div>
                <h2
                  id="privacy-heading"
                  className="font-display text-xl font-semibold text-ink"
                >
                  {t.landing.privacyTitle}
                </h2>
                <p className="text-xs text-muted">No external data transmission without patient consent</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">{t.landing.privacyBody}</p>
          </section>
        </main>
      </div>

      {/* PROFESSIONAL FOOTER */}
      <footer className="border-t border-clinic-100 bg-white/90 glass-header mt-12">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-muted">
            <div className="flex items-center gap-3">
              <span className="font-display text-sm font-semibold text-clinic-800">
                Sehat Saathi
              </span>
              <span>·</span>
              <span className="font-medium text-clinic-600">Smart India Hackathon (SIH26047)</span>
            </div>
            <p className="max-w-md text-right text-[11px] text-muted">
              Prototype pre-consultation intake tool. All clinical decisions and diagnoses are made strictly by qualified physicians.
            </p>
          </div>
          <div className="mt-4 border-t border-clinic-50 pt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted/80">
            <p>© 2026 Sehat Saathi · Clinical Triage Prototype · Physician Verification Required</p>
            <div className="flex gap-4">
              <span>ABDM-Aligned</span>
              <span>FHIR R4 Ready</span>
              <span>Deterministic Triage</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
