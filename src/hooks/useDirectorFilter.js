import { useEffect, useState } from "react";
import { getCachedDirectedMovieIds } from "../lib/tmdb";

// The set of movie ids a given person directed (per TMDB's crew credits,
// job === "Director"), or null while nothing is selected/still loading.
// Backed by the shared getCachedDirectedMovieIds cache, so re-selecting the
// same director (even across sections) doesn't refetch.
export function useDirectorFilter(personId) {
  const [directedMovieIds, setDirectedMovieIds] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!personId) {
      setDirectedMovieIds(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getCachedDirectedMovieIds(personId).then((ids) => {
      if (cancelled) return;
      setDirectedMovieIds(ids);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [personId]);

  return { directedMovieIds, loading };
}
