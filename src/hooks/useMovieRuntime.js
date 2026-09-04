import { useEffect, useState } from "react";
import { formatRuntime, getCachedMovieDetails } from "../lib/tmdb";

// Formatted runtime ("1h 49m") for a movie, or null while it's loading or
// unavailable. Backed by the shared getCachedMovieDetails cache, so the
// same movie showing up across multiple cards/sections only ever fetches
// once per session.
export function useMovieRuntime(movieId) {
  const [runtime, setRuntime] = useState(null);

  useEffect(() => {
    if (!movieId) {
      setRuntime(null);
      return;
    }

    let cancelled = false;
    setRuntime(null);

    getCachedMovieDetails(movieId).then((details) => {
      if (cancelled) return;
      setRuntime(details?.runtime ? formatRuntime(details.runtime) : null);
    });

    return () => {
      cancelled = true;
    };
  }, [movieId]);

  return runtime;
}
