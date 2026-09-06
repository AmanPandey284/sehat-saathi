import { Link } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { useLanguage } from "../i18n/LanguageContext";

export default function PatientLanding() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-6 pb-20 pt-8">
        <section className="max-w-2xl">
          <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            {t.landing.heading}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-7 text-muted">
            {t.landing.subheading}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/patient/consent"
              className="rounded-full bg-clinic-600 px-8 py-4 text-lg font-medium text-white shadow-sm transition hover:bg-clinic-700"
            >
              {t.landing.startButton}
            </Link>
            <Link
              to="/doctor"
              className="rounded-full border border-clinic-600 px-8 py-4 text-lg font-medium text-clinic-700 transition hover:bg-clinic-50"
            >
              {t.landing.doctorButton}
            </Link>
            <Link to="/patient/ayush" className="rounded-full border border-clinic-200 px-6 py-4 text-lg font-medium text-muted hover:bg-clinic-50">AYUSH mode</Link>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="workflow-heading">
          <h2
            id="workflow-heading"
            className="font-display text-sm font-semibold uppercase tracking-wide text-clinic-600"
          >
            {t.landing.workflowTitle}
          </h2>

          <ol className="mt-6 grid gap-4 sm:grid-cols-5">
            {t.landing.stages.map((stage, index) => (
              <li
                key={stage.label}
                className="flex flex-col gap-2 rounded-2xl border border-clinic-100 bg-white p-5 shadow-sm"
              >
                <span className="font-display text-2xl text-clinic-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-semibold text-ink">{stage.label}</span>
                <span className="text-sm text-muted">{stage.detail}</span>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="mt-10 rounded-2xl border border-clinic-100 bg-white p-6 shadow-sm"
          aria-labelledby="privacy-heading"
        >
          <h2
            id="privacy-heading"
            className="font-display text-sm font-semibold uppercase tracking-wide text-clinic-600"
          >
            {t.landing.privacyTitle}
          </h2>
          <p className="mt-3 text-muted">{t.landing.privacyBody}</p>
        </section>

        <footer className="mt-10 rounded-xl border border-clinic-100 bg-clinic-50 p-4 text-sm text-clinic-800">
          {t.landing.disclaimer}
        </footer>
      </main>
    </div>
  );
}
