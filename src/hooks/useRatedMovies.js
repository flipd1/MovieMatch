import { useCallback, useEffect, useState } from "react";
import { getMovieDetails } from "../lib/tmdb";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export function useRatedMovies(userId) {
  const [ratedMovies, setRatedMovies] = useState({});
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState(null);

  const loadRatings = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("ratings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const rows = data ?? [];
      const details = await Promise.all(
        rows.map((row) => getMovieDetails(row.movie_id).catch(() => null))
      );

      const next = {};
      rows.forEach((row, i) => {
        const movie = details[i];
        next[row.movie_id] = {
          id: row.movie_id,
          rating: row.rating,
          title: movie?.title ?? `Movie #${row.movie_id}`,
          poster_path: movie?.poster_path ?? null,
          release_date: movie?.release_date ?? "",
          genre_ids: movie?.genres?.map((g) => g.id) ?? [],
          vote_average: movie?.vote_average ?? null,
          ratedAt: new Date(row.created_at).getTime(),
        };
      });

      setRatedMovies(next);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadRatings();
  }, [loadRatings]);

  const rateMovie = useCallback(
    async (movie, rating) => {
      if (!isSupabaseConfigured || !userId) return;

      setRatedMovies((prev) => {
        const next = { ...prev };
        if (rating === 0) {
          delete next[movie.id];
        } else {
          next[movie.id] = {
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            release_date: movie.release_date,
            genre_ids: movie.genre_ids ?? prev[movie.id]?.genre_ids ?? [],
            vote_average:
              movie.vote_average ?? prev[movie.id]?.vote_average ?? null,
            rating,
            ratedAt: prev[movie.id]?.ratedAt ?? Date.now(),
          };
        }
        return next;
      });

      try {
        if (rating === 0) {
          const { error: deleteError } = await supabase
            .from("ratings")
            .delete()
            .eq("user_id", userId)
            .eq("movie_id", movie.id);
          if (deleteError) throw deleteError;
        } else {
          const { error: upsertError } = await supabase
            .from("ratings")
            .upsert(
              { user_id: userId, movie_id: movie.id, rating },
              { onConflict: "user_id,movie_id" }
            );
          if (upsertError) throw upsertError;
        }
      } catch (e) {
        setError(e);
        loadRatings();
      }
    },
    [userId, loadRatings]
  );

  const list = Object.values(ratedMovies).sort((a, b) => b.ratedAt - a.ratedAt);

  return { ratedMovies, list, rateMovie, loading, error };
}
