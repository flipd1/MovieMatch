import { getCachedActedMovieIds } from "../lib/tmdb";
import { usePersonMovieIds } from "./usePersonMovieIds";

// The set of movie ids a given person acted in (per TMDB's cast credits),
// or null while nothing is selected/still loading.
export function useActorFilter(personId) {
  const { movieIds, loading } = usePersonMovieIds(
    personId,
    getCachedActedMovieIds
  );
  return { actedMovieIds: movieIds, loading };
}
