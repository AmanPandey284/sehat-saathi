import { Link } from "react-router-dom";

/**
 * Used for routes that exist in the navigation but whose real screen hasn't
 * been built yet. This is deliberate: it's more honest to say "not built
 * yet" than to link to nothing, or worse, to fake a working screen.
 */
export default function ComingSoon({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <p className="font-display text-2xl text-clinic-700">{label}</p>
      <p className="max-w-md text-muted">
        This part of Sehat Saathi hasn't been built yet — it arrives in an
        upcoming milestone. This page exists to confirm the navigation and
        routing between screens already works.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-full border border-clinic-600 px-5 py-2 font-medium text-clinic-700 transition hover:bg-clinic-50"
      >
        Back to home
      </Link>
    </main>
  );
}
