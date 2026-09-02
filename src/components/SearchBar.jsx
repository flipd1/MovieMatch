import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { posterUrl, searchMovies, yearFromDate } from "../lib/tmdb";
import StarRating from "./StarRating";

export default function SearchBar({ ratedMovies, onRate, onOpen }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    searchMovies(debouncedQuery)
      .then((data) => {
        if (!cancelled) setResults(data.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleSelect = (movie) => {
    onOpen?.(movie);
    setIsOpen(false);
  };

  const showDropdown = isOpen && query.trim().length > 0;

  return (
    <div className="relative w-full max-w-xl" ref={containerRef}>
      <svg
        viewBox="0 0 20 20"
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 fill-none stroke-fg-muted stroke-2 pointer-events-none"
      >
        <circle cx="9" cy="9" r="6.5" />
        <line x1="18" y1="18" x2="13.8" y2="13.8" />
      </svg>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => query.trim() && setIsOpen(true)}
        placeholder="Search for a movie…"
        className="w-full bg-surface border border-border rounded-full pl-10 pr-4 py-2.5 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-border-strong focus:border-border-strong transition-all"
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-surface-strong border border-border rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/60 overflow-hidden z-20 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-2 space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 animate-pulse"
                >
                  <div className="w-10 h-14 rounded bg-surface-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-surface-muted" />
                    <div className="h-2.5 w-1/4 rounded bg-surface-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length ? (
            <ul>
              {results.slice(0, 8).map((movie) => {
                const poster = posterUrl(movie.poster_path, "w92");
                return (
                  <li key={movie.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelect(movie)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSelect(movie);
                      }}
                      className="flex items-center gap-3 p-2 hover:bg-fill transition-colors cursor-pointer"
                    >
                      <div className="w-10 h-14 rounded overflow-hidden bg-surface-muted shrink-0">
                        {poster ? (
                          <img
                            src={poster}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-fg font-medium truncate">
                          {movie.title}
                        </p>
                        <p className="text-xs text-fg-muted">
                          {yearFromDate(movie.release_date)}
                        </p>
                      </div>
                      <StarRating
                        rating={ratedMovies[movie.id]?.rating ?? 0}
                        onRate={(r) => onRate(movie, r)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-fg-muted text-sm text-center py-6 px-4">
              No results for &ldquo;{debouncedQuery}&rdquo;.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
