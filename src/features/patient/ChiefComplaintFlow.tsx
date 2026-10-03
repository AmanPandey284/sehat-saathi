import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import AppHeader from "../../components/AppHeader";
import ContextualHelp from "../../components/ContextualHelp";
import { useLanguage } from "../../i18n/LanguageContext";
import {
  classifyFreeText,
  classifyFromQuickButton,
  classifyRouted,
  SUPPORTED_COMPLAINTS,
  type ComplaintClassification,
} from "./services/complaintClassifier";
import { usePatientSession } from "./state/PatientSessionContext";
import { normalizeDuration } from "./services/durationNormalizer";
import { detectUrgentComplaintText } from "../safety/safetyEngine";
import { analyzePatientInput } from "../../adaptiveQuestionEngine";
import { BASE_URL } from "../../services/api";
import { getAuthorizationHeader } from "../../services/authStorage";

type Step = "input" | "unknown" | "confirm";
type InputMode = "type" | "speak";

export default function ChiefComplaintFlow() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { setChiefComplaint, safetyFlags, setSafetyFlags, consentGranted } =
    usePatientSession();

  useEffect(() => {
    if (!consentGranted) {
      navigate("/patient/consent", { replace: true });
    }
  }, [consentGranted, navigate]);

  useEffect(() => {
    if (safetyFlags.some((f) => f.severity === "urgent")) {
      navigate("/patient/emergency", { replace: true });
    }
  }, [safetyFlags, navigate]);

  if (safetyFlags.some((f) => f.severity === "urgent")) return null;

  const [step, setStep] = useState<Step>("input");
  const [inputMode, setInputMode] = useState<InputMode>("type");
  const [draftInput, setDraftInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [classification, setClassification] =
    useState<ComplaintClassification | null>(null);

  // Voice recording and transcription states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceConsent, setVoiceConsent] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Clean up recording tracks, timers, and object URLs
  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          mediaRecorderRef.current.stream
            .getTracks()
            .forEach((track) => track.stop());
        } catch {}
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setVoiceStatus(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setVoiceStatus(
          language === "hi"
            ? "ऑडियो रिकॉर्ड हो गया है। नीचे ट्रांसक्रिप्ट की समीक्षा करें या बदलाव करें।"
            : "Audio captured. Review or edit the transcript below before continuing."
        );
      };

      // Optional real-time local browser speech recognition
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = language === "hi" ? "hi-IN" : "en-IN";

          recognition.onresult = (event: any) => {
            let current = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
              current += event.results[i][0].transcript;
            }
            if (current.trim()) {
              setDraftInput((prev) =>
                prev ? `${prev} ${current.trim()}` : current.trim()
              );
              setValidationError(null);
            }
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch {}
      }

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      setVoiceStatus(
        language === "hi"
          ? "माइक्रोफ़ोन पहुंच उपलब्ध नहीं है। कृपया टाइप करके लक्षण बताएं।"
          : "Microphone access unavailable or denied. Please type your symptoms."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
    }
  };

  const handleTranscribeWithServer = async () => {
    if (!audioBlob) {
      setVoiceStatus(
        language === "hi"
          ? "कृपया पहले ऑडियो रिकॉर्ड करें।"
          : "Please record audio before requesting transcription."
      );
      return;
    }
    if (!voiceConsent) {
      setVoiceStatus(
        language === "hi"
          ? "कृपया AI ट्रांसक्रिप्शन सहमति चेकबॉक्स चुनें।"
          : "Please check the consent box to authorize external transcription."
      );
      return;
    }

    setTranscribing(true);
    setVoiceStatus(
      language === "hi"
        ? "क्लिनिकल सेवा द्वारा ट्रांसक्रिप्शन किया जा रहा है..."
        : "Transcribing audio via clinical service..."
    );

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "chief_complaint.webm");
      formData.append("consent_obtained", "true");

      const authHeaders = getAuthorizationHeader();

      const res = await fetch(`${BASE_URL}/api/ai/transcribe`, {
        method: "POST",
        headers: {
          ...authHeaders,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.transcript) {
          setDraftInput(data.transcript);
          setValidationError(null);
          setVoiceStatus(
            language === "hi"
              ? "ट्रांसक्रिप्शन पूरा हुआ। कृपया नीचे दिए गए पाठ की समीक्षा करें।"
              : "Transcription complete. Review and make any corrections below."
          );
        } else {
          setVoiceStatus(
            data.error ||
              (language === "hi"
                ? "स्वचालित ट्रांसक्रिप्शन अनुपलब्ध। कृपया हस्तलिखित रूप में दर्ज करें।"
                : "Automated transcription unavailable. Please enter symptoms manually.")
          );
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setVoiceStatus(
          errData.detail ||
            (language === "hi"
              ? "ट्रांसक्रिप्शन सेवा ऑफ़लाइन है। कृपया नीचे टाइप करें।"
              : "Transcription service offline. Please edit below.")
        );
      }
    } catch {
      setVoiceStatus(
        language === "hi"
          ? "नेटवर्क समस्या। कृपया नीचे टाइप करके आगे बढ़ें।"
          : "Network error during transcription. Please edit below."
      );
    } finally {
      setTranscribing(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? `0${s}` : s}`;
  };

  function handleQuickButton(id: (typeof SUPPORTED_COMPLAINTS)[number]) {
    setValidationError(null);
    setClassification(classifyFromQuickButton(id));
    setStep("confirm");
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
      setStep("confirm");
      return;
    }

    // ── Priority 3: Body-system categories ───────────────────────────
    const routedResult = classifyRouted(draftInput);

    if (routedResult.complaintId) {
      setChiefComplaint({
        complaintId: routedResult.complaintId,
        displayName: routedResult.displayName ?? routedResult.originalInput,
        originalInput: draftInput,
        confidence: routedResult.confidence,
        source: "patient",
      });

      sessionStorage.removeItem("sehatSaathi_adaptive_analysis");
      navigate("/patient/history");
      return;
    }

    // ── Priority 4: Adaptive overlay — unrecognised free text with concepts ──
    const adaptiveAnalysis = analyzePatientInput(draftInput);

    if (
      adaptiveAnalysis.questions.length > 0 &&
      adaptiveAnalysis.concepts.some((concept) => concept !== "unknown")
    ) {
      sessionStorage.setItem(
        "sehatSaathi_adaptive_analysis",
        JSON.stringify(adaptiveAnalysis)
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

  function handleConfirmYes() {
    if (!classification?.complaintId || !classification.displayName) return;
    sessionStorage.removeItem("sehatSaathi_adaptive_analysis");
    setChiefComplaint({
      complaintId: classification.complaintId,
      displayName: classification.displayName,
      originalInput: classification.originalInput,
      confidence: classification.confidence,
      source: "patient",
    });
    navigate("/patient/history");
  }

  const duration = classification?.originalInput
    ? normalizeDuration(classification.originalInput)
    : null;

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-6 pb-20 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-clinic-600">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-clinic-100 text-clinic-700 text-[11px]">
                2
              </span>
              <span>{t.complaint.progressLabel}</span>
            </div>
            <ContextualHelp
              titleEn="Chief Complaint"
              titleHi="मुख्य लक्षण"
              explanationEn="Select the problem you came to the doctor about today."
              explanationHi="वह मुख्य समस्या चुनें जिसके लिए आप आज डॉक्टर के पास आए हैं।"
            />
          </div>

          {step === "input" && (
            <div className="mt-4 rounded-3xl border border-clinic-100 bg-white/95 p-8 shadow-sm sm:p-10 glass-card">
              <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                {t.complaint.heading}
              </h1>
              <p className="mt-2 text-sm text-muted">
                {language === "hi"
                  ? "अपनी भाषा में बताएं कि आपको क्या तकलीफ हो रही है। आप टाइप कर सकते हैं या बोलकर बता सकते हैं।"
                  : "Explain your symptom in simple everyday language. You can type or speak."}
              </p>

              {/* Seamless Segmented Mode Switcher: Type vs Speak */}
              <div className="mt-6 flex items-center p-1 bg-clinic-50 border border-clinic-200/80 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setInputMode("type")}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
                    inputMode === "type"
                      ? "bg-white text-clinic-900 shadow-xs border border-clinic-200"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  <span>{language === "hi" ? "टाइप करें" : "Type"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("speak")}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
                    inputMode === "speak"
                      ? "bg-white text-clinic-900 shadow-xs border border-clinic-200"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                  <span>{language === "hi" ? "बोलकर बताएं" : "Speak"}</span>
                </button>
              </div>

              {/* Mode 1: Direct Typing */}
              {inputMode === "type" && (
                <div className="mt-4">
                  <label htmlFor="complaint-input" className="sr-only">
                    {t.complaint.textareaLabel}
                  </label>
                  <textarea
                    id="complaint-input"
                    value={draftInput}
                    onChange={(e) => {
                      setDraftInput(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder={t.complaint.textareaPlaceholder}
                    rows={4}
                    className="w-full rounded-2xl border border-clinic-200 p-4 text-base sm:text-lg text-ink focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-100 transition shadow-xs"
                  />
                </div>
              )}

              {/* Mode 2: Speak with Live Recording & Transcript Review */}
              {inputMode === "speak" && (
                <div className="mt-4 rounded-2xl border border-clinic-200 bg-clinic-50/50 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {language === "hi" ? "बोलकर लक्षण बताएं" : "Speak your symptoms"}
                      </p>
                      <p className="text-xs text-muted">
                        {language === "hi"
                          ? "हिंदी या अंग्रेजी में बोलें। बोलने के बाद आप पाठ की समीक्षा व संपादन कर सकते हैं।"
                          : "Describe your condition naturally. You can review and edit the transcript below."}
                      </p>
                    </div>
                    {isRecording && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 animate-pulse">
                        <span className="h-2 w-2 rounded-full bg-red-600" />
                        <span>{formatTimer(recordingDuration)}</span>
                      </span>
                    )}
                  </div>

                  {/* Recording Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="inline-flex items-center gap-2 rounded-xl bg-clinic-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-clinic-700 transition"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                          />
                        </svg>
                        <span>
                          {language === "hi" ? "बोलना शुरू करें" : "Start speaking"}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-red-700 transition"
                      >
                        <span className="h-2 w-2 bg-white rounded-xs" />
                        <span>
                          {language === "hi" ? "रिकॉर्डिंग रोकें" : "Stop recording"}
                        </span>
                      </button>
                    )}

                    {audioBlob && !isRecording && (
                      <span className="text-xs text-emerald-700 font-medium">
                        ✓ {language === "hi" ? "ऑडियो दर्ज हुआ" : "Audio captured"} ({formatTimer(recordingDuration)})
                      </span>
                    )}
                  </div>

                  {/* Audio Playback */}
                  {audioUrl && (
                    <div className="pt-1">
                      <audio controls src={audioUrl} className="w-full h-9 rounded-lg" />
                    </div>
                  )}

                  {/* Optional AI Transcription Consent & Trigger */}
                  {audioBlob && !isRecording && (
                    <div className="rounded-xl border border-clinic-200/80 bg-white p-3.5 space-y-2.5 text-xs">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={voiceConsent}
                          onChange={(e) => setVoiceConsent(e.target.checked)}
                          className="mt-0.5 rounded border-clinic-300 text-clinic-600 focus:ring-clinic-500"
                        />
                        <span className="text-muted leading-relaxed">
                          {language === "hi"
                            ? "मैं स्वचालित वाक्-से-पाठ रूपांतरण के लिए इस ऑडियो को सुरक्षित क्लिनिकल ट्रांसक्रिप्शन सेवा में प्रसंस्कृत करने की सहमति देता हूँ।"
                            : "I consent to transmitting this audio to the clinical transcription service for automated speech-to-text processing."}
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={handleTranscribeWithServer}
                        disabled={!voiceConsent || transcribing}
                        className="inline-flex items-center gap-2 rounded-lg bg-clinic-100 px-3.5 py-1.5 font-semibold text-clinic-800 hover:bg-clinic-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {transcribing ? (
                          <>
                            <span className="h-3 w-3 rounded-full border-2 border-clinic-600 border-t-transparent animate-spin" />
                            <span>
                              {language === "hi"
                                ? "ट्रांसक्राइब किया जा रहा है..."
                                : "Transcribing..."}
                            </span>
                          </>
                        ) : (
                          <span>
                            {language === "hi"
                              ? "AI ट्रांसक्रिप्शन प्राप्त करें"
                              : "Transcribe with AI"}
                          </span>
                        )}
                      </button>
                    </div>
                  )}

                  {voiceStatus && (
                    <p className="text-xs text-clinic-800 bg-clinic-100/50 rounded-lg p-2.5">
                      {voiceStatus}
                    </p>
                  )}

                  {/* Transcript Review and Correction Textarea */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="transcript-review"
                        className="text-xs font-semibold text-ink"
                      >
                        {language === "hi"
                          ? "ट्रांसक्रिप्ट समीक्षा (आवश्यकतानुसार सुधारें):"
                          : "Transcript review (edit if needed):"}
                      </label>
                      <span className="text-[11px] text-muted">
                        {language === "hi" ? "संपादनीय" : "Editable"}
                      </span>
                    </div>
                    <textarea
                      id="transcript-review"
                      value={draftInput}
                      onChange={(e) => {
                        setDraftInput(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      placeholder={
                        language === "hi"
                          ? "बोलने पर आपका पाठ यहाँ दिखेगा, जिसे आप आवश्यकतानुसार बदल सकते हैं..."
                          : "Your spoken words will appear here. You can make corrections or add details..."
                      }
                      rows={3}
                      className="w-full rounded-xl border border-clinic-200 bg-white p-3 text-sm text-ink focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-100 transition"
                    />
                  </div>
                </div>
              )}

              {validationError && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                  {validationError}
                </p>
              )}

              {/* Quick Complaint Buttons */}
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

              {/* Navigation Actions */}
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
              <span className="text-3xl" aria-hidden>
                📝
              </span>
              <h1 className="mt-3 font-display text-2xl font-semibold text-ink">
                {language === "hi"
                  ? "अपनी समस्या दर्ज करें"
                  : "Recorded in your words"}
              </h1>
              <p className="mt-3 text-sm text-muted leading-relaxed">
                {language === "hi"
                  ? "आपकी समस्या आपके ही शब्दों में सहेजी गई है। क्लिनिकल हिस्ट्री बिना किसी अनुमान के जारी रहेगी।"
                  : "Your problem was saved in your own words. A general intake will continue without guessing a diagnosis."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    const clean = draftInput.trim();
                    setChiefComplaint({
                      complaintId: "custom",
                      displayName: clean
                        ? `Main symptom: ${clean}`
                        : "Main symptom",
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
                  {language === "hi"
                    ? "शिकायत की पहचान"
                    : "Identified Chief Complaint"}
                </p>
              </div>

              <h1 className="mt-3 font-display text-2xl font-semibold text-ink sm:text-3xl">
                {classification.displayName}
              </h1>
              <p className="mt-2 text-sm text-muted">
                {language === "hi" ? "रोगी ने बताया:" : "Patient reported:"} “
                {classification.originalInput}”
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-clinic-100 bg-clinic-50/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    Category
                  </p>
                  <p className="mt-1 font-semibold text-clinic-900">
                    {classification.displayName}
                  </p>
                </div>
                {duration?.normalizedDays != null && (
                  <div className="rounded-2xl border border-clinic-100 bg-clinic-50/70 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                      Normalized Duration
                    </p>
                    <p className="mt-1 font-semibold text-clinic-900">
                      {duration.normalizedDays} days
                    </p>
                  </div>
                )}
              </div>

              <p className="mt-6 text-sm font-medium text-ink">
                {language === "hi"
                  ? "क्या यह जानकारी सही है?"
                  : "Does this accurately describe your main reason for visit?"}
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
                  {language === "hi" ? "हाँ, आगे बढ़ें" : "Yes, Continue to History"}{" "}
                  →
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
