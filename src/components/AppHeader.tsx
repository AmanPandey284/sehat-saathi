import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { getHealth } from "../services/api";
import LanguageSelector from "./LanguageSelector";

type BackendStatus = "checking" | "online" | "offline";

function StatusPill({ status }: { status: BackendStatus }) {
  const { t } = useLanguage();

  const styles: Record<BackendStatus, string> = {
    checking: "bg-clinic-50 text-clinic-700",
    online: "bg-clinic-100 text-clinic-800",
    offline: "bg-flag-50 text-flag-700",
  };

  const dotStyles: Record<BackendStatus, string> = {
    checking: "bg-clinic-400",
    online: "bg-clinic-600",
    offline: "bg-flag-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${styles[status]}`}
      role="status"
    >
      <span
        className={`h-2 w-2 rounded-full ${dotStyles[status]}`}
        aria-hidden="true"
      />
      {t.status[status]}
    </span>
  );
}

export default function AppHeader({
  showStatus = false,
}: {
  showStatus?: boolean;
}) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    if (!showStatus) return;

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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-clinic-600 to-clinic-700 text-white shadow-sm shadow-clinic-600/20">
            <span className="text-xl leading-none select-none">🩺</span>
          </div>
          <div>
            <span className="font-display text-xl font-semibold tracking-tight text-clinic-800">
              {t.brand}
            </span>
            <span className="ml-2 hidden rounded-full border border-clinic-200 bg-clinic-50/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-clinic-700 sm:inline-block">
              SIH26047
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showStatus && <StatusPill status={status} />}
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
}
