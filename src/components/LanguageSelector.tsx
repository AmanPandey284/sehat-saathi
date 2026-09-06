import { useLanguage } from "../i18n/LanguageContext";
import { LANGUAGE_LABELS, type Language } from "../i18n/translations";

const LANGUAGES: Language[] = ["en", "hi"];

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Choose language"
      className="inline-flex rounded-full border border-clinic-200 bg-white p-1"
    >
      {LANGUAGES.map((code) => {
        const selected = code === language;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={selected}
            onClick={() => setLanguage(code)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              selected
                ? "bg-clinic-600 text-white"
                : "text-clinic-700 hover:bg-clinic-50"
            }`}
          >
            {LANGUAGE_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
