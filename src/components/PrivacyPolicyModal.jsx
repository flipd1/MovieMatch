import { useEffect } from "react";

export default function PrivacyPolicyModal({ onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-surface-strong rounded-xl overflow-hidden ring-1 ring-border my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-fill hover:bg-fill-hover text-fg transition-colors cursor-pointer"
        >
          <svg
            viewBox="0 0 20 20"
            className="w-4 h-4 fill-none stroke-current stroke-2"
          >
            <line x1="4" y1="4" x2="16" y2="16" />
            <line x1="16" y1="4" x2="4" y2="16" />
          </svg>
        </button>

        <div className="p-6 sm:p-8 space-y-5">
          <h2 className="text-xl font-semibold text-fg">Privacy Policy</h2>

          <div className="space-y-4 text-sm text-fg-secondary leading-relaxed">
            <p>
              MovieMatch is built to work without asking you to create an
              account. Here&apos;s exactly what we store and why, in plain
              language.
            </p>

            <div>
              <h3 className="text-sm font-medium text-fg mb-1">
                What we store
              </h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>The movies you rate, and your star rating for each.</li>
                <li>
                  Your selected streaming services, so we can filter
                  recommendations to what you can actually watch.
                </li>
                <li>
                  An email address — only if you choose to add one from the
                  Account section, to let you sign in on another device.
                </li>
              </ul>
              <p className="mt-2">
                We don&apos;t collect anything beyond this: no browsing
                history, no location, no analytics profile tied to you as a
                person.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-fg mb-1">
                Where it&apos;s stored
              </h3>
              <p>
                Your data is stored in{" "}
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-fg"
                >
                  Supabase
                </a>
                , the database and authentication provider MovieMatch runs
                on. Movie details, posters, and streaming availability come
                from{" "}
                <a
                  href="https://www.themoviedb.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-fg"
                >
                  The Movie Database (TMDB)
                </a>{" "}
                — we don&apos;t send your ratings or personal data to TMDB;
                we only read public movie information from them.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-fg mb-1">
                What we don&apos;t do
              </h3>
              <p>
                We don&apos;t sell your data, and we don&apos;t share it with
                third parties for advertising or any other purpose. It exists
                only to make MovieMatch work for you.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-fg mb-1">
                Anonymous by default
              </h3>
              <p>
                When you first open MovieMatch, you&apos;re given an
                anonymous account automatically — no signup, no password.
                Your ratings and services stay tied to that anonymous
                account and never require a real-world identity unless you
                explicitly choose to add an email for cross-device access.
                If you never add one, nothing about you is personally
                identifiable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
