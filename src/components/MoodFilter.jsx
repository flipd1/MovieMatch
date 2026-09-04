import { MOODS } from "../lib/moods";

export default function MoodFilter({ activeMoodId, onChange }) {
  return (
    // Same "never wrap, scroll if it overflows" pattern as TabNav — on
    // desktop the five pills fit and this renders identically to a plain
    // row; on mobile, where they don't fit, it scrolls horizontally on one
    // line instead of wrapping into a multi-row block.
    <div className="max-w-full overflow-x-auto">
      <div className="inline-flex items-center gap-2 w-max">
        {MOODS.map((mood) => {
          const active = activeMoodId === mood.id;
          return (
            <button
              key={mood.id}
              type="button"
              onClick={() => onChange(active ? null : mood.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                active
                  ? "bg-amber-400 border-amber-400 text-black"
                  : "bg-transparent border-border-strong text-fg-muted hover:text-fg hover:border-fg-faint"
              }`}
            >
              {mood.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
