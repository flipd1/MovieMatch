import { useEffect, useState } from "react";

// The set of movie ids associated with a person for a particular credit
// relation (directed, acted in, ...) — shared by useDirectorFilter and
// useActorFilter, which just supply which cached lookup to use.
export function usePersonMovieIds(personId, getCachedIds) {
  const [movieIds, setMovieIds] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!personId) {
      setMovieIds(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getCachedIds(personId).then((ids) => {
      if (cancelled) return;
      setMovieIds(ids);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [personId, getCachedIds]);

  return { movieIds, loading };
}
