import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { posterUrl, searchMovies, yearFromDate } from "../lib/tmdb";
import StarRating from "./StarRating";

// Matches Tailwind's default `sm` breakpoint — below this, focusing the
// input switches to a full-screen "search mode" instead of the inline
// dropdown, so the on-screen keyboard doesn't leave the page scrolling
// independently underneath it.
const MOBILE_QUERY = "(max-width: 639px)";

export default function SearchBar({ ratedMovies, onRate, onOpen }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    setIsMobile(mql.matches);
    const handleChange = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

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

  const closeSearch = () => {
    setIsOpen(false);
    inputRef.current?.blur();
  };

  useEffect(() => {
    function handleClickOutside(e) {
      // On mobile the overlay fills the whole screen, so there's no
      // "outside" to detect this way — Cancel/Escape handle closing it
      // instead (see below).
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === "Escape") closeSearch();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const overlayActive = isOpen && isMobile;

  // Lock background scroll while the full-screen overlay is up, same
  // pattern the modals (MovieDetail, WatchTonightModal) already use —
  // without this the page behind the keyboard could still scroll
  // independently, which is exactly the disconnected feel this is fixing.
  useEffect(() => {
    if (!overlayActive) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [overlayActive]);

  // The portal below (see the final return) mounts a fresh <input> DOM
  // node in a different place in the tree than the one that was just
  // tapped to open it — browsers don't carry focus across that swap on
  // their own, so without this the on-screen keyboard would immediately
  // close the instant search mode opens.
  useEffect(() => {
    if (overlayActive) inputRef.current?.focus();
  }, [overlayActive]);

  const handleSelect = (movie) => {
    onOpen?.(movie);
    closeSearch();
  };

  const showDropdown = isOpen && query.trim().length > 0;

  const resultsList =
    loading ? (
      <div className="p-2 space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
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
    );

  const searchUI = (
    <div
      ref={containerRef}
      className={
        overlayActive
          ? "fixed inset-0 z-50 bg-bg flex flex-col"
          : "relative w-full max-w-xl"
      }
    >
      <div
        className={
          overlayActive
            ? "flex items-center gap-2 p-3 border-b border-border shrink-0"
            : "relative"
        }
      >
        <div className="relative flex-1">
          <svg
            viewBox="0 0 20 20"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 fill-none stroke-fg-muted stroke-2 pointer-events-none"
          >
            <circle cx="9" cy="9" r="6.5" />
            <line x1="18" y1="18" x2="13.8" y2="13.8" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search for a movie…"
            className="w-full bg-surface border border-border rounded-full pl-10 pr-4 py-2.5 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-border-strong focus:border-border-strong transition-all"
          />
        </div>

        {overlayActive && (
          <button
            type="button"
            onClick={closeSearch}
            className="shrink-0 text-sm font-medium text-fg-muted hover:text-fg px-2 py-2 cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          className={
            overlayActive
              ? "flex-1 overflow-y-auto"
              : "absolute left-0 right-0 top-full mt-2 bg-surface-strong border border-border rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/60 overflow-hidden z-20 max-h-96 overflow-y-auto"
          }
        >
          {resultsList}
        </div>
      )}
    </div>
  );

  // The header this normally lives in has a backdrop-blur, which creates a
  // new CSS containing block for any `position: fixed` descendant — so a
  // "fixed inset-0" overlay rendered in place would only ever fill the
  // header's own box, not the real viewport. Portaling straight to
  // document.body sidesteps that entirely once search mode is active.
  return overlayActive ? createPortal(searchUI, document.body) : searchUI;
}
