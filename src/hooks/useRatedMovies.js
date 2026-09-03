import { useCallback, useEffect, useRef, useState } from "react";
import { getMovieDetails } from "../lib/tmdb";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

async function fetchRatedMovies(userId) {
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

  return next;
}

export function useRatedMovies(userId) {
  const [ratedMovies, setRatedMovies] = useState({});
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState(null);

  // loadRatings (triggered by userId changing) and mergeRatings' own
  // reload (triggered right after a sign-in-and-merge) can both be
  // in-flight around the same auth transition, in either order, with no
  // guarantee which finishes first — a plain "last setRatedMovies call
  // wins" is really "whichever network round trip happens to finish
  // last wins", which isn't reliable (confirmed: it picked the stale one
  // often enough in practice that merged ratings needed a manual page
  // reload to show up). This counter fixes that properly: every fetch
  // claims the next generation number when it *starts*, and only commits
  // its result if that's still the latest generation by the time it
  // finishes — so whichever fetch started most recently always wins,
  // regardless of which one's network calls happen to resolve first.
  const generationRef = useRef(0);

  const loadRatings = useCallback(async () => {
    const myGeneration = ++generationRef.current;

    if (!isSupabaseConfigured || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const next = await fetchRatedMovies(userId);
      if (generationRef.current !== myGeneration) return; // superseded
      setRatedMovies(next);
    } catch (e) {
      if (generationRef.current === myGeneration) setError(e);
    } finally {
      if (generationRef.current === myGeneration) setLoading(false);
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

  // Folds another session's ratings into `targetUserId`'s — used when
  // signing into a real account from a browser that already has its own
  // anonymous ratings, and the user chose to keep both rather than
  // discard the local ones. `sourceRatedMovies` has to be captured by the
  // caller *before* the session switch: once it's switched, RLS blocks
  // reading the old (now different auth.uid()) session's rows entirely,
  // even though they still exist in the table. Existing ratings on the
  // target account always win — this only fills in movies the account
  // doesn't already have a rating for, it never overwrites one.
  const mergeRatings = useCallback(async (targetUserId, sourceRatedMovies) => {
    if (!isSupabaseConfigured || !targetUserId) return;

    const sourceEntries = Object.values(sourceRatedMovies).filter(
      (m) => m.rating > 0
    );
    if (!sourceEntries.length) return;

    const { data: existing, error: fetchError } = await supabase
      .from("ratings")
      .select("movie_id")
      .eq("user_id", targetUserId);
    if (fetchError) throw fetchError;

    const existingIds = new Set((existing ?? []).map((r) => r.movie_id));
    const toMerge = sourceEntries.filter((m) => !existingIds.has(m.id));
    if (!toMerge.length) return;

    const { error: upsertError } = await supabase.from("ratings").upsert(
      toMerge.map((m) => ({
        user_id: targetUserId,
        movie_id: m.id,
        rating: m.rating,
      })),
      { onConflict: "user_id,movie_id" }
    );
    if (upsertError) throw upsertError;

    // Claimed *after* the upsert commits, right before the reload it
    // guards — see the generationRef comment above for why this is
    // needed rather than a plain setRatedMovies call here.
    const myGeneration = ++generationRef.current;
    const next = await fetchRatedMovies(targetUserId);
    if (generationRef.current !== myGeneration) return; // superseded
    setRatedMovies(next);
  }, []);

  const list = Object.values(ratedMovies).sort((a, b) => b.ratedAt - a.ratedAt);

  return { ratedMovies, list, rateMovie, mergeRatings, loading, error };
}
