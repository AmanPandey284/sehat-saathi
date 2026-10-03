import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { getHealth } from "../services/api";
import LanguageSelector from "./LanguageSelector";

type BackendStatus = "checking" | "online" | "offline";

export default function AppHeader({
  showStatus = false,
}: {
  showStatus?: boolean;
}) {
  const { t, language } = useLanguage();
  const [status, setStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    getHealth()
      .then(() => {
        if (!cancelled) setStatus("online");
      })
      .catch(() => {
        if (!cancelled) setStatus("offline");
      });

    return () => {
      cancelled = true;
    };
  }, [showStatus]);

  return (
    <header className="sticky top-0 z-30 border-b border-clinic-100/80 glass-header">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3.5">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-clinic-600 to-clinic-700 text-white shadow-xs">
            <span className="text-lg leading-none select-none">🩺</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-semibold tracking-tight text-clinic-900 group-hover:text-clinic-700 transition">
              {t.brand}
            </span>
            <span className="hidden rounded-full border border-clinic-200 bg-clinic-50 px-2 py-0.5 text-[10px] font-semibold text-clinic-700 sm:inline-block">
              SIH26047
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Restrained secondary navigation */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/doctors"
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:text-clinic-800 hover:bg-clinic-50/70 transition"
            >
              {language === "hi" ? "डॉक्टर खोजें" : "Find a doctor"}
            </Link>
            <Link
              to="/patient/help"
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:text-clinic-800 hover:bg-clinic-50/70 transition"
            >
              {language === "hi" ? "सहायता" : "Help"}
            </Link>
          </nav>

          {/* Show service status ONLY when offline disruption occurs */}
          {status === "offline" && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
              role="status"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
              <span>{language === "hi" ? "ऑफ़लाइन मोड" : "Offline mode"}</span>
            </span>
          )}

          <LanguageSelector />
        </div>
      </div>
    </header>
  );
}
