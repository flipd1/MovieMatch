import { useEffect, useState } from "react";
import ServiceCheckboxes from "./ServiceCheckboxes";

// The "Only show what I can watch" checkbox. If the user hasn't set any
// streaming services yet, checking it opens a prompt (reusing the same
// service picker as Watch Tonight) instead of silently filtering against
// an empty list, which would show everything unfiltered.
export default function WatchableOnlyToggle({
  checked,
  onChange,
  services,
  onServicesChange,
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [draftServices, setDraftServices] = useState(services);

  useEffect(() => {
    if (showPrompt) setDraftServices(services);
  }, [showPrompt, services]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setShowPrompt(false);
    };
    if (showPrompt) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showPrompt]);

  const handleToggle = (e) => {
    const next = e.target.checked;
    if (next && services.length === 0) {
      setShowPrompt(true);
      return;
    }
    onChange(next);
  };

  const toggleDraftService = (id) => {
    setDraftServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    onServicesChange(draftServices);
    setShowPrompt(false);
    if (draftServices.length > 0) onChange(true);
  };

  return (
    <>
      <label className="flex items-center gap-2 text-xs text-fg-muted cursor-pointer shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={handleToggle}
          className="accent-amber-400 w-3.5 h-3.5"
        />
        Only show what I can watch
      </label>

      {showPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowPrompt(false)}
        >
          <div
            className="w-full max-w-sm bg-surface-strong border border-border rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/60 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-medium text-fg mb-1">
                Which services do you have?
              </h3>
              <p className="text-xs text-fg-muted">
                Select your streaming services so we can filter to what you
                can actually watch.
              </p>
            </div>

            <ServiceCheckboxes
              selected={draftServices}
              onToggle={toggleDraftService}
            />

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPrompt(false)}
                className="flex-1 text-sm font-medium bg-fill hover:bg-fill-hover text-fg rounded-lg py-2 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!draftServices.length}
                className="flex-1 text-sm font-medium bg-amber-400 hover:bg-amber-300 disabled:bg-surface-muted disabled:text-fg-faint disabled:cursor-not-allowed text-black rounded-lg py-2 transition-colors cursor-pointer"
              >
                Save & Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
