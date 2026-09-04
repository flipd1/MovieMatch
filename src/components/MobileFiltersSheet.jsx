import { useEffect } from "react";

// A bottom-sheet variant of the app's usual centered modal — used only on
// mobile (its trigger button is sm:hidden) to hold Genre/Director/Sort/
// watchable-only together instead of them competing for vertical space as
// separate rows. Same escape/scroll-lock behavior as the other modals.
export default function MobileFiltersSheet({ onClose, children }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        // dvh (not vh) so this actually shrinks with the on-screen
        // keyboard instead of claiming 80% of the full screen height
        // behind it — vh stays pinned to the layout viewport, which
        // doesn't account for the keyboard, and made the sheet feel like
        // it was jumping/resizing oddly whenever an input inside it (e.g.
        // the director search) got focused.
        className="w-full max-w-lg max-h-[80dvh] overflow-y-auto bg-surface-strong rounded-t-2xl ring-1 ring-border p-5 pb-8 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-fg">Filters</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-fill hover:bg-fill-hover text-fg transition-colors cursor-pointer"
          >
            <svg
              viewBox="0 0 20 20"
              className="w-4 h-4 fill-none stroke-current stroke-2"
            >
              <line x1="4" y1="4" x2="16" y2="16" />
              <line x1="16" y1="4" x2="4" y2="16" />
            </svg>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
