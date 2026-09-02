import { useCallback, useEffect, useState } from "react";
import { getMovieDetails } from "../lib/tmdb";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

// Pro-gated custom lists ("Date Night", "Comfort Watches", etc). Mirrors
// useRatedMovies' shape: lists carry only movie ids, and a shared
// moviesById cache (fetched once per unique id across all lists, like
// useRatedMovies fetches per rating) supplies the title/poster/etc a
// MovieCard needs to render them.
//
// Every mutation is optimistic. On failure it rolls back only the specific
// change that failed — never a full reload — so an in-flight failure on
// one list can't wipe out other optimistic changes made in the same
// session (the same bug class fixed in useDismissedMovies).
export function useLists(userId) {
  const [lists, setLists] = useState([]);
  const [moviesById, setMoviesById] = useState({});
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [{ data: listRows, error: listsError }, { data: memberRows, error: membersError }] =
        await Promise.all([
          supabase
            .from("lists")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: true }),
          supabase.from("list_movies").select("*").eq("user_id", userId),
        ]);

      if (listsError) throw listsError;
      if (membersError) throw membersError;

      const movieIdsByList = new Map();
      (memberRows ?? []).forEach((row) => {
        const arr = movieIdsByList.get(row.list_id) ?? [];
        arr.push(row.movie_id);
        movieIdsByList.set(row.list_id, arr);
      });

      setLists(
        (listRows ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          createdAt: row.created_at,
          movieIds: movieIdsByList.get(row.id) ?? [],
        }))
      );

      const uniqueMovieIds = Array.from(
        new Set((memberRows ?? []).map((r) => r.movie_id))
      );
      const details = await Promise.all(
        uniqueMovieIds.map((id) => getMovieDetails(id).catch(() => null))
      );
      const nextMoviesById = {};
      uniqueMovieIds.forEach((id, i) => {
        const movie = details[i];
        if (!movie) return;
        nextMoviesById[id] = {
          id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
          genre_ids: movie.genres?.map((g) => g.id) ?? [],
        };
      });
      setMoviesById(nextMoviesById);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const createList = useCallback(
    async (name) => {
      const trimmed = name.trim();
      if (!trimmed || !isSupabaseConfigured || !userId) return null;

      const tempId = `temp-${Date.now()}`;
      setLists((prev) => [
        ...prev,
        { id: tempId, name: trimmed, createdAt: new Date().toISOString(), movieIds: [] },
      ]);

      try {
        const { data, error: insertError } = await supabase
          .from("lists")
          .insert({ user_id: userId, name: trimmed })
          .select()
          .single();
        if (insertError) throw insertError;

        setLists((prev) =>
          prev.map((l) =>
            l.id === tempId
              ? { id: data.id, name: data.name, createdAt: data.created_at, movieIds: [] }
              : l
          )
        );
        return data.id;
      } catch (e) {
        setError(e);
        setLists((prev) => prev.filter((l) => l.id !== tempId));
        return null;
      }
    },
    [userId]
  );

  const renameList = useCallback(
    async (listId, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      let previousName;
      setLists((prev) =>
        prev.map((l) => {
          if (l.id !== listId) return l;
          previousName = l.name;
          return { ...l, name: trimmed };
        })
      );

      if (!isSupabaseConfigured || !userId) return;

      try {
        const { error: updateError } = await supabase
          .from("lists")
          .update({ name: trimmed })
          .eq("id", listId)
          .eq("user_id", userId);
        if (updateError) throw updateError;
      } catch (e) {
        setError(e);
        setLists((prev) =>
          prev.map((l) => (l.id === listId ? { ...l, name: previousName } : l))
        );
      }
    },
    [userId]
  );

  const deleteList = useCallback(
    async (listId) => {
      let removed;
      setLists((prev) => {
        removed = prev.find((l) => l.id === listId);
        return prev.filter((l) => l.id !== listId);
      });

      if (!isSupabaseConfigured || !userId) return;

      try {
        const { error: deleteError } = await supabase
          .from("lists")
          .delete()
          .eq("id", listId)
          .eq("user_id", userId);
        if (deleteError) throw deleteError;
      } catch (e) {
        setError(e);
        if (removed) setLists((prev) => [...prev, removed]);
      }
    },
    [userId]
  );

  const addMovieToList = useCallback(
    async (listId, movie) => {
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId && !l.movieIds.includes(movie.id)
            ? { ...l, movieIds: [...l.movieIds, movie.id] }
            : l
        )
      );
      setMoviesById((prev) =>
        prev[movie.id]
          ? prev
          : {
              ...prev,
              [movie.id]: {
                id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path,
                release_date: movie.release_date,
                genre_ids: movie.genre_ids ?? [],
              },
            }
      );

      if (!isSupabaseConfigured || !userId) return;

      try {
        const { error: upsertError } = await supabase
          .from("list_movies")
          .upsert(
            { list_id: listId, user_id: userId, movie_id: movie.id },
            { onConflict: "list_id,movie_id" }
          );
        if (upsertError) throw upsertError;
      } catch (e) {
        setError(e);
        setLists((prev) =>
          prev.map((l) =>
            l.id === listId
              ? { ...l, movieIds: l.movieIds.filter((id) => id !== movie.id) }
              : l
          )
        );
      }
    },
    [userId]
  );

  const removeMovieFromList = useCallback(
    async (listId, movieId) => {
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId
            ? { ...l, movieIds: l.movieIds.filter((id) => id !== movieId) }
            : l
        )
      );

      if (!isSupabaseConfigured || !userId) return;

      try {
        const { error: deleteError } = await supabase
          .from("list_movies")
          .delete()
          .eq("list_id", listId)
          .eq("movie_id", movieId)
          .eq("user_id", userId);
        if (deleteError) throw deleteError;
      } catch (e) {
        setError(e);
        setLists((prev) =>
          prev.map((l) =>
            l.id === listId && !l.movieIds.includes(movieId)
              ? { ...l, movieIds: [...l.movieIds, movieId] }
              : l
          )
        );
      }
    },
    [userId]
  );

  return {
    lists,
    moviesById,
    loading,
    error,
    createList,
    renameList,
    deleteList,
    addMovieToList,
    removeMovieFromList,
  };
}
