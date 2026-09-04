import { SORT_OPTIONS } from "../lib/sortMovies";

export default function SortControl({ sortId, onChange }) {
  return (
    <select
      value={sortId ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      aria-label="Sort by"
      className="bg-transparent border border-border-strong rounded-full pl-3 pr-2 py-1.5 text-xs font-medium text-fg-muted hover:text-fg focus:outline-none focus:ring-1 focus:ring-border-strong cursor-pointer"
    >
      <option value="" className="bg-surface-strong text-fg">
        Sort by
      </option>
      {SORT_OPTIONS.map((option) => (
        <option
          key={option.id}
          value={option.id}
          className="bg-surface-strong text-fg"
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
