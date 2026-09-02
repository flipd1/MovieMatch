import { STREAMING_SERVICES } from "../lib/providers";

export default function ServiceCheckboxes({ selected, onToggle }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {STREAMING_SERVICES.map((service) => {
        const checked = selected.includes(service.id);
        return (
          <label
            key={service.id}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
              checked
                ? "bg-amber-400/10 border-amber-400/40 text-fg"
                : "bg-surface-muted border-border text-fg-muted hover:border-border-strong"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(service.id)}
              className="accent-amber-400 w-3.5 h-3.5"
            />
            {service.name}
          </label>
        );
      })}
    </div>
  );
}
