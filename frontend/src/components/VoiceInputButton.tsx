import { useEffect, useRef, useState } from "react";

type VoiceLanguage = "en" | "hi";

interface VoiceInputButtonProps {
  language: VoiceLanguage;
  onTranscript: (text: string) => void;
  className?: string;
  disabled?: boolean;
}

export default function VoiceInputButton({
  language,
  onTranscript,
  className = "",
  disabled = false,
}: VoiceInputButtonProps) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => () => {
    try {
      recognitionRef.current?.abort?.();
    } catch {
      // Ignore browser cleanup errors.
    }
  }, []);

  const start = () => {
    type SpeechCtor = new () => any;
    const Ctor =
      (window as unknown as { SpeechRecognition?: SpeechCtor }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechCtor })
        .webkitSpeechRecognition;

    if (!Ctor) {
      return;
    }

    try {
      const rec = new Ctor();
      recognitionRef.current = rec;
      rec.lang = language === "hi" ? "hi-IN" : "en-IN";
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? "";
        if (transcript) onTranscript(transcript);
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };

      setListening(true);
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const stop = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // Ignore stop errors.
    }
    setListening(false);
  };

  const unsupported = typeof window !== "undefined" &&
    !("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const label = listening
    ? language === "hi" ? "सुन रहा है…" : "Listening…"
    : language === "hi" ? "बोलें" : "Speak";
  const title = unsupported
    ? language === "hi" ? "इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है" : "Voice input is not supported in this browser"
    : listening
      ? language === "hi" ? "रिकॉर्डिंग रोकें" : "Stop listening"
      : language === "hi" ? "बोलकर जवाब दें" : "Answer by speaking";

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      disabled={disabled || unsupported}
      title={title}
      aria-label={title}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition hover:border-clinic-500 hover:bg-clinic-50 disabled:cursor-not-allowed disabled:opacity-50 ${listening ? "border-clinic-600 bg-clinic-50 text-clinic-700" : "border-clinic-200 bg-white text-clinic-700"} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-6 w-6 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <path d="M12 18v4" />
        <path d="M8 22h8" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
