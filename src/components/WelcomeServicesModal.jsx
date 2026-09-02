import { useEffect, useState } from "react";
import ServiceCheckboxes from "./ServiceCheckboxes";

// One-time first-visit prompt to set streaming services, so new users get
// filtered recommendations, New Releases, and a pre-filled Watch Tonight
// without having to find Settings themselves first. Purely a shortcut to
// the same picker that lives in Settings — skipping this never blocks
// anything, and services can always be changed later there.
export default function WelcomeServicesModal({ onSave, onSkip }) {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onSkip();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onSkip]);

  const toggleService = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onSkip}
    >
      <div
        className="w-full max-w-sm bg-surface-strong border border-border rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/60 p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="text-base font-semibold text-fg mb-1">
            Welcome to MovieMatch
          </h3>
          <p className="text-sm text-fg-muted">
            Which streaming services do you have? We&apos;ll use this to
            filter recommendations to what you can actually watch, and to
            pre-fill Watch Tonight. Totally optional, and you can change
            this anytime in Settings.
          </p>
        </div>

        <ServiceCheckboxes selected={selected} onToggle={toggleService} />

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 text-sm font-medium bg-fill hover:bg-fill-hover text-fg rounded-lg py-2 transition-colors cursor-pointer"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={() => onSave(selected)}
            disabled={!selected.length}
            className="flex-1 text-sm font-medium bg-amber-400 hover:bg-amber-300 disabled:bg-surface-muted disabled:text-fg-faint disabled:cursor-not-allowed text-black rounded-lg py-2 transition-colors cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
