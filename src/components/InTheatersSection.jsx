import { useEffect, useMemo, useState } from "react";
import { formatReleaseDate, getNowPlayingMovies } from "../lib/tmdb";
import { buildGenreProfile, scoreByGenreOverlap } from "../lib/taste";
import { filterByMood } from "../lib/moods";
import MovieCard from "./MovieCard";
import MoodFilter from "./MoodFilter";

const BADGE_COUNT = 3;
const NOW_PLAYING_PAGES = 3;

export default function InTheatersSection({
  ratedMovies,
  onRate,
  onOpen,
  onAddToList,
}) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moodId, setMoodId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Page 1 carries TMDB's own "dates" window for what counts as
    // currently in theaters. Later pages of /movie/now_playing can include
    // limited re-releases with much older release_dates (e.g. anniversary
    // screenings), so every result is clamped to that window — this is
    // still exclusively /movie/now_playing data, just filtered to what
    // TMDB itself considers "now playing" right now.
    getNowPlayingMovies(1)
      .then((firstPage) =>
        Promise.all(
          Array.from({ length: NOW_PLAYING_PAGES - 1 }, (_, i) =>
            getNowPlayingMovies(i + 2).catch(() => ({ results: [] }))
          )
        ).then((restPages) => ({
          dates: firstPage.dates,
          pages: [firstPage, ...restPages],
        }))
      )
      .then(({ dates, pages }) => {
        if (cancelled) return;

        const seen = new Map();
        pages.forEach((page) => {
          (page.results ?? []).forEach((movie) => {
            if (!seen.has(movie.id)) seen.set(movie.id, movie);
          });
        });

        let merged = Array.from(seen.values());
        if (dates?.minimum && dates?.maximum) {
          merged = merged.filter(
            (movie) =>
              movie.release_date &&
              movie.release_date >= dates.minimum &&
              movie.release_date <= dates.maximum
          );
        }

        setMovies(merged);
      })
      .catch(() => {
        if (!cancelled) setMovies([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const hasRatings = Object.values(ratedMovies).some((m) => m.rating > 0);

  const { sortedMovies, topScoringIds } = useMemo(() => {
    if (!hasRatings) {
      const byPopularity = [...movies].sort(
        (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)
      );
      return { sortedMovies: byPopularity, topScoringIds: new Set() };
    }

    const profile = buildGenreProfile(ratedMovies);
    const scored = movies
      .map((movie) => ({
        movie,
        score: scoreByGenreOverlap(movie, profile),
      }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          (b.movie.vote_average ?? 0) - (a.movie.vote_average ?? 0)
      );

    const topIds = new Set(
      scored
        .filter((entry) => entry.score > 0)
        .slice(0, BADGE_COUNT)
        .map((entry) => entry.movie.id)
    );

    return {
      sortedMovies: scored.map((entry) => entry.movie),
      topScoringIds: topIds,
    };
  }, [movies, ratedMovies, hasRatings]);

  const displayMovies = filterByMood(sortedMovies, moodId);

  const emptyMessage = moodId
    ? "Nothing matches this mood right now — try another."
    : null;

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[2/3] rounded-lg bg-surface animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <MoodFilter activeMoodId={moodId} onChange={setMoodId} />
      </div>

      {!movies.length ? (
        <div className="text-center py-16 text-fg-muted">
          <p className="text-sm">
            Couldn&apos;t load movies in theaters right now.
          </p>
        </div>
      ) : displayMovies.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {displayMovies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              rating={ratedMovies[movie.id]?.rating ?? 0}
              onRate={onRate}
              onOpen={onOpen}
              badge={topScoringIds.has(movie.id) ? "Matches Your Taste" : null}
              dateLabel={formatReleaseDate(movie.release_date)}
              onAddToList={onAddToList}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-fg-muted">
          <p className="text-sm">{emptyMessage}</p>
        </div>
      )}
    </>
  );
}
