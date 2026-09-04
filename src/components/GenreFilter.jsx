import { useEffect, useRef, useState } from "react";
import { GENRE_NAMES } from "../lib/tmdb";

const GENRE_OPTIONS = Object.entries(GENRE_NAMES)
  .map(([id, name]) => ({ id: Number(id), name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function GenreFilter({ selectedGenreIds, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggleGenre = (id) => {
    onChange(
      selectedGenreIds.includes(id)
        ? selectedGenreIds.filter((g) => g !== id)
        : [...selectedGenreIds, id]
    );
  };

  const label =
    selectedGenreIds.length === 0
      ? "Genre"
      : selectedGenreIds.length === 1
        ? GENRE_NAMES[selectedGenreIds[0]]
        : `Genre (${selectedGenreIds.length})`;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
          selectedGenreIds.length
            ? "bg-amber-400 border-amber-400 text-black"
            : "bg-transparent border-border-strong text-fg-muted hover:text-fg hover:border-fg-faint"
        }`}
      >
        {label}
        <svg
          viewBox="0 0 20 20"
          className="w-3 h-3 fill-none stroke-current stroke-2"
        >
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-56 max-h-72 overflow-y-auto bg-surface-strong border border-border rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/60 z-20 p-2">
          {GENRE_OPTIONS.map((genre) => {
            const checked = selectedGenreIds.includes(genre.id);
            return (
              <label
                key={genre.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-fill cursor-pointer text-sm text-fg"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleGenre(genre.id)}
                  className="accent-amber-400 w-3.5 h-3.5"
                />
                {genre.name}
              </label>
            );
          })}
          {selectedGenreIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-center text-xs font-medium text-fg-muted hover:text-fg underline mt-1 py-1.5 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
