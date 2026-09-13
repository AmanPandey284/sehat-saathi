import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

interface ContextualHelpProps {
  titleEn?: string;
  titleHi?: string;
  explanationEn: string;
  explanationHi: string;
}

export default function ContextualHelp({
  titleEn = 'Help for this step',
  titleHi = 'इस चरण के लिए सहायता',
  explanationEn,
  explanationHi,
}: ContextualHelpProps) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const title = language === 'hi' ? titleHi : titleEn;
  const explanation = language === 'hi' ? explanationHi : explanationEn;

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(explanation);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.9; // Slightly slower for elderly/first-time users
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleClose = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsOpen(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-clinic-300 bg-white/95 px-3 py-1.5 text-xs font-semibold text-clinic-800 shadow-2xs hover:border-clinic-500 hover:bg-clinic-50 transition"
        aria-label={language === 'hi' ? 'सहायता प्राप्त करें' : 'Get Help for this step'}
      >
        <span className="text-sm">❓</span>
        <span>{language === 'hi' ? 'सहायता चाहिए?' : 'Need Help?'}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-clinic-100 bg-white p-6 shadow-xl sm:p-7 text-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-clinic-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-clinic-100 text-base text-clinic-700">
                  🤝
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-clinic-700">
                    {language === 'hi' ? 'सेहत साथी सहायक' : 'Sehat Saathi Sahayak'}
                  </span>
                  <h2 className="font-display text-base font-semibold text-ink leading-tight">
                    {title}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="rounded-full p-1.5 text-muted hover:bg-slate-100 hover:text-ink transition"
                aria-label={language === 'hi' ? 'बंद करें' : 'Close help'}
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium leading-relaxed text-ink/90 sm:text-base">
                {explanation}
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-clinic-100 pt-4">
              <Link
                to="/patient/help"
                onClick={handleClose}
                className="text-xs font-semibold text-clinic-700 hover:text-clinic-800 hover:underline transition text-center sm:text-left"
              >
                {language === 'hi' ? 'संपूर्ण मार्गदर्शिका देखें →' : 'View Full Guide →'}
              </Link>

              <div className="flex items-center justify-end gap-2">
                {typeof window !== 'undefined' && 'speechSynthesis' in window && (
                  <button
                    type="button"
                    onClick={handleSpeak}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-clinic-200 bg-clinic-50 px-3.5 py-2 text-xs font-semibold text-clinic-800 hover:bg-clinic-100 transition"
                  >
                    <span>{isSpeaking ? '⏹️' : '🔊'}</span>
                    <span>{isSpeaking ? (language === 'hi' ? 'रोकें' : 'Stop') : (language === 'hi' ? 'सुनें' : 'Listen')}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl bg-clinic-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-clinic-700 transition"
                >
                  {language === 'hi' ? 'समझ गए' : 'Got it'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
