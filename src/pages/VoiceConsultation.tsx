import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { useLanguage } from "../i18n/LanguageContext";
import { usePatientSession } from "../features/patient/state/PatientSessionContext";
import { BASE_URL } from "../services/api";
import { getAuthorizationHeader } from "../services/authStorage";

export default function VoiceConsultation() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { setChiefComplaint } = usePatientSession();

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [transcribing, setTranscribing] = useState(false);
  const [consentGranted, setConsentGranted] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Clean up MediaStream tracks, timers, and audio object URLs on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
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
    setStatusMessage("");
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

        setStatusMessage(
          language === "hi"
            ? "ऑडियो रिकॉर्ड हो गया है। कृपया नीचे अपनी समस्या की समीक्षा करें या टाइप करें।"
            : "Audio recorded. Review playback below, or type your symptoms directly."
        );
      };

      // Optional browser speech recognition for real-time local transcription
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
              setTranscript((prev) => (prev ? `${prev} ${current.trim()}` : current.trim()));
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
      setStatusMessage(
        language === "hi"
          ? "माइक्रोफ़ोन अनुपलब्ध है। कृपया नीचे टाइप करके अपनी समस्या बताएं।"
          : "Microphone access unavailable or denied. Please type your symptoms below."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
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
      setStatusMessage("Please record audio before requesting automated transcription.");
      return;
    }
    if (!consentGranted) {
      setStatusMessage("Please check the consent box to authorize external AI transcription processing.");
      return;
    }

    setTranscribing(true);
    setStatusMessage("Transcribing audio via secure clinical service...");

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "consultation_recording.webm");
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
          setTranscript(data.transcript);
          setStatusMessage("Transcription complete. Please review and edit before saving.");
        } else {
          setStatusMessage(data.error || "Automated transcription unavailable. Please enter symptoms manually.");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setStatusMessage(errData.detail || "Transcription service offline. Please type your symptoms below.");
      }
    } catch {
      setStatusMessage("Network error during transcription. Please type your symptoms below.");
    } finally {
      setTranscribing(false);
    }
  };

  const handleSaveToConsultation = () => {
    const cleanTranscript = transcript.trim();
    if (!cleanTranscript) {
      setStatusMessage(
        language === "hi"
          ? "कृपया आगे बढ़ने से पहले अपनी समस्या बोलें या टाइप करें।"
          : "Please record or type your symptoms before continuing."
      );
      return;
    }

    setChiefComplaint({
      complaintId: "custom",
      displayName: cleanTranscript.slice(0, 60) + (cleanTranscript.length > 60 ? "..." : ""),
      originalInput: cleanTranscript,
      confidence: 1.0,
      source: "patient",
    });

    navigate("/patient/history");
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? `0${s}` : s}`;
  };

  return (
    <div className="min-h-screen bg-canvas mesh-gradient flex flex-col justify-between">
      <div>
        <AppHeader />
        <main className="mx-auto max-w-xl px-6 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-clinic-600">
                <span>🎙️</span>
                <span>{language === "hi" ? "ध्वनि परामर्श व वॉयस इनटेक" : "Voice Consultation Recording"}</span>
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold text-ink">
                {language === "hi" ? "बोलकर अपनी समस्या बताएं" : "Voice Message for Doctor"}
              </h1>
            </div>

            <Link
              to="/patient/entry"
              className="text-xs font-semibold text-clinic-700 hover:text-clinic-900 underline"
            >
              ← {language === "hi" ? "इनटेक पर लौटें" : "Back to Intake"}
            </Link>
          </div>

          <div className="rounded-3xl border border-clinic-100 bg-white/95 p-6 sm:p-8 shadow-sm glass-card">
            {/* Disclaimer & Clinical Boundary */}
            <div className="mb-6 rounded-2xl bg-clinic-50/60 p-4 border border-clinic-100 text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-clinic-700">Notice: </span>
              {language === "hi"
                ? "यह वॉयस रिकॉर्डिंग आपके परामर्श डॉक्टर के संदर्भ के लिए सुरक्षित रखी जाती है। स्वचालित प्रतिलेखन वैकल्पिक है और इसे बदला जा सकता है।"
                : "Voice recordings are preserved for your physician's clinical review. Automated transcription is optional and requires your explicit consent."}
            </div>

            {/* Recorder Controls */}
            <div className="flex flex-col items-center justify-center py-6 border-b border-clinic-100">
              <div className="relative mb-4">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`h-24 w-24 rounded-full flex items-center justify-center text-3xl shadow-lg transition transform active:scale-95 ${
                    isRecording
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-clinic-600 text-white hover:bg-clinic-700 hover:scale-105"
                  }`}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isRecording ? "⏹" : "🎙"}
                </button>
              </div>

              <div className="text-center">
                <p className="text-sm font-semibold text-ink">
                  {isRecording
                    ? language === "hi"
                      ? "रिकॉर्डिंग चल रही है..."
                      : "Recording in progress..."
                    : language === "hi"
                    ? "रिकॉर्ड करने के लिए माइक दबाएं"
                    : "Tap microphone to speak"}
                </p>
                <p className="font-mono text-xs text-slate-500 mt-1">
                  {formatTimer(recordingDuration)}
                </p>
              </div>
            </div>

            {/* Playback Preview */}
            {audioUrl && (
              <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  {language === "hi" ? "रिकॉर्डिंग सुनें" : "Playback Audio"}
                </p>
                <audio controls src={audioUrl} className="w-full h-10" />

                {/* Optional Cloud AI Transcription Gate */}
                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentGranted}
                      onChange={(e) => setConsentGranted(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-clinic-600 focus:ring-clinic-500"
                    />
                    <span>
                      {language === "hi"
                        ? "मैं एआई ट्रांसक्रिप्शन सेवा के माध्यम से ऑडियो प्रोसेस करने की सहमति देता/देती हूँ।"
                        : "I consent to processing this audio recording via external AI transcription services."}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleTranscribeWithServer}
                    disabled={transcribing || !consentGranted}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white border border-clinic-300 px-3.5 py-1.5 text-xs font-semibold text-clinic-700 hover:bg-clinic-50 disabled:opacity-40 transition shadow-2xs"
                  >
                    <span>✨</span>
                    <span>{transcribing ? "Transcribing..." : "Transcribe with AI"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Status Message Banner */}
            {statusMessage && (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">
                {statusMessage}
              </div>
            )}

            {/* Editable Symptoms Input */}
            <div className="mt-6">
              <label htmlFor="symptoms-transcript" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                {language === "hi" ? "लक्षण व समस्या (समीक्षा व संपादन करें)" : "Reported Symptoms (Review & Edit)"}
              </label>
              <textarea
                id="symptoms-transcript"
                rows={4}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={
                  language === "hi"
                    ? "बोलने पर लक्षण यहाँ दिखाई देंगे, या आप सीधे लिख सकते हैं..."
                    : "Spoken symptoms will appear here, or you can type them directly..."
                }
                className="w-full rounded-2xl border border-clinic-200 p-4 text-sm text-ink focus:border-clinic-500 focus:outline-none focus:ring-2 focus:ring-clinic-100 transition leading-relaxed"
              />
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleSaveToConsultation}
                disabled={!transcript.trim()}
                className="flex-1 rounded-full bg-clinic-600 py-3.5 text-sm font-semibold text-white hover:bg-clinic-700 disabled:opacity-50 transition shadow-sm text-center"
              >
                {language === "hi" ? "सलाह व इतिहास पर आगे बढ़ें →" : "Save & Continue to History →"}
              </button>
            </div>
          </div>
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-muted">
        Sehat Saathi · SIH26047 · Patient Voice Consultation
      </footer>
    </div>
  );
}
