import { getCachedDirectedMovieIds } from "../lib/tmdb";
import { usePersonMovieIds } from "./usePersonMovieIds";

// The set of movie ids a given person directed (per TMDB's crew credits,
// job === "Director"), or null while nothing is selected/still loading.
export function useDirectorFilter(personId) {
  const { movieIds, loading } = usePersonMovieIds(
    personId,
    getCachedDirectedMovieIds
  );
  return { directedMovieIds: movieIds, loading };
}
