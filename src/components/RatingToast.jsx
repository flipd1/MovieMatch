import { useEffect, useState } from "react";

// Brief, app-wide confirmation for rating a movie — on mobile especially,
// tapping a star on a card (Recommendations, In Theaters, etc.) can make
// that card vanish almost immediately (rated movies drop out of those
// lists on the next render), leaving no time to notice the star filling
// in as feedback. This gives an explicit, harder-to-miss confirmation
// that isn't tied to the card's own lifetime.
export default function RatingToast({ toast, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;

    setVisible(false);
    // A timeout (not requestAnimationFrame) for the "show" transition —
    // rAF never fires while the tab is backgrounded, which would leave
    // the toast permanently stuck at opacity-0 if a rating happened to
    // land right as the tab lost focus.
    const showTimer = setTimeout(() => setVisible(true), 10);
    const hideTimer = setTimeout(() => setVisible(false), 1600);
    const doneTimer = setTimeout(() => onDone(), 1900);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(doneTimer);
    };
  }, [toast, onDone]);

  if (!toast) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 sm:bottom-8 z-[60] flex justify-center px-4 pointer-events-none">
      <div
        className={`flex items-center gap-2 max-w-full bg-fg text-bg rounded-full pl-2 pr-4 py-2 shadow-2xl shadow-black/30 transition-all duration-200 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <span className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
          <svg
            viewBox="0 0 20 20"
            className="w-3 h-3 fill-none stroke-black stroke-[3]"
          >
            <path
              d="M4 10l4 4 8-8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-sm font-medium truncate">
          {toast.rating > 0 ? (
            <>
              Rated <span className="font-semibold">{toast.title}</span>{" "}
              {toast.rating}★
            </>
          ) : (
            <>
              Removed rating for{" "}
              <span className="font-semibold">{toast.title}</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
