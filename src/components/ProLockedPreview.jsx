// Free-tier preview for gated features: a dimmed, blurred sample of the
// real content behind a lock + upsell, rather than an empty page. Purely
// presentational — the parent decides what "sample" content to blur.
export default function ProLockedPreview({
  onUnlock,
  title,
  description,
  children,
}) {
  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none select-none blur-sm opacity-40"
      >
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-bg/40 via-bg/80 to-bg p-6">
        <div className="text-center space-y-4 max-w-sm">
          <span className="inline-flex items-center gap-1 bg-amber-400 text-black text-xs font-bold uppercase tracking-wide rounded-full px-3 py-1">
            Pro
          </span>
          <h3 className="text-xl font-semibold text-fg">{title}</h3>
          <p className="text-sm text-fg-muted">{description}</p>
          <button
            type="button"
            onClick={onUnlock}
            className="bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded-full px-6 py-2.5 transition-colors cursor-pointer"
          >
            Unlock Pro
          </button>
        </div>
      </div>
    </div>
  );
}
