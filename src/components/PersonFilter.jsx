import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { searchPeople } from "../lib/tmdb";

// Shared by DirectorFilter and ActorFilter — a debounced person-search
// autocomplete, restricted to people from the given TMDB department so a
// director search doesn't surface actors (and vice versa).
export default function PersonFilter({
  selected,
  onSelect,
  department, // "Directing" | "Acting"
  placeholder,
  chipPrefix,
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    searchPeople(debouncedQuery)
      .then((data) => {
        if (cancelled) return;
        const matches = (data.results ?? []).filter(
          (person) => person.known_for_department === department
        );
        setSuggestions(matches.slice(0, 8));
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, department]);

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

  const handlePick = (person) => {
    onSelect({ id: person.id, name: person.name });
    setQuery("");
    setSuggestions([]);
    setOpen(false);
  };

  if (selected) {
    return (
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-400 border border-amber-400 text-black cursor-pointer"
      >
        {chipPrefix} {selected.name}
        <svg
          viewBox="0 0 20 20"
          className="w-3 h-3 fill-none stroke-current stroke-2"
        >
          <line x1="5" y1="5" x2="15" y2="15" strokeLinecap="round" />
          <line x1="15" y1="5" x2="5" y2="15" strokeLinecap="round" />
        </svg>
      </button>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        // text-base (16px) avoids iOS Safari auto-zooming the whole page
        // on focus — anything smaller triggers that zoom, which is what
        // made typing here feel like the screen was "resizing". sm: drops
        // back to the compact toolbar size once there's no on-screen
        // keyboard to trigger it.
        className="w-32 sm:w-40 bg-transparent border border-border-strong rounded-full px-3 py-1.5 text-base sm:text-xs text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-border-strong"
      />

      {open && query.trim() && (
        <div className="absolute left-0 top-full mt-2 w-56 max-h-72 overflow-y-auto bg-surface-strong border border-border rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/60 z-20">
          {suggestions.length ? (
            <ul>
              {suggestions.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => handlePick(person)}
                    className="w-full text-left px-3 py-2 text-sm text-fg hover:bg-fill transition-colors cursor-pointer"
                  >
                    {person.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-fg-muted text-xs text-center py-3 px-3">
              No {department === "Directing" ? "directors" : "actors"} found
              for &ldquo;{debouncedQuery}&rdquo;.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
