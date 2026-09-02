// Visual tag for a feature currently in early access — visually distinct
// from the amber "Pro" badge (see TabNav.jsx / ProLockedPreview.jsx) so the
// two "this is gated" signals don't get confused with each other.
export default function BetaBadge({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center bg-sky-400 text-black text-[9px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5 ${className}`}
    >
      Beta
    </span>
  );
}
