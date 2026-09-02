import { MOODS } from "../lib/moods";

export default function MoodFilter({ activeMoodId, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {MOODS.map((mood) => {
        const active = activeMoodId === mood.id;
        return (
          <button
            key={mood.id}
            type="button"
            onClick={() => onChange(active ? null : mood.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
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
  );
}
