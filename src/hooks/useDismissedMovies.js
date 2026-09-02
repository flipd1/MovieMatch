import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

// Movies the user marked "Not Interested" in Recommended for You. Excluded
// from that user's future candidate pool (see lib/candidatePool.js) going
// forward, persisted so the exclusion survives reloads and other devices.
export function useDismissedMovies(userId) {
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("dismissed_recommendations")
        .select("movie_id")
        .eq("user_id", userId);

      if (error) throw error;
      setDismissedIds(new Set((data ?? []).map((row) => row.movie_id)));
    } catch {
      setDismissedIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const dismissMovie = useCallback(
    async (movieId) => {
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(movieId);
        return next;
      });

      if (!isSupabaseConfigured || !userId) return;

      try {
        const { error } = await supabase
          .from("dismissed_recommendations")
          .upsert(
            { user_id: userId, movie_id: movieId },
            { onConflict: "user_id,movie_id" }
          );
        if (error) throw error;
      } catch {
        // Persisting failed (e.g. offline, or the dismissed_recommendations
        // migration hasn't been run yet) — roll back just this movie rather
        // than reloading, which would wipe out any other dismissals made
        // optimistically in the same session.
        setDismissedIds((prev) => {
          const next = new Set(prev);
          next.delete(movieId);
          return next;
        });
      }
    },
    [userId]
  );

  return { dismissedIds, dismissMovie, loading };
}
