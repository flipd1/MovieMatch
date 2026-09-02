import { useEffect, useState } from "react";
import { buildCandidatePool } from "../lib/candidatePool";
import { filterByMood } from "../lib/moods";
import { useProviderFilter } from "../hooks/useProviderFilter";
import MovieCard from "./MovieCard";
import MoodFilter from "./MoodFilter";
import WatchableOnlyToggle from "./WatchableOnlyToggle";

const DISPLAY_LIMIT = 20;

function PosterGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[2/3] rounded-lg bg-surface animate-pulse"
        />
      ))}
    </div>
  );
}

export default function RecommendationsSection({
  ratedMovies,
  ratingsLoading,
  services,
  onServicesChange,
  onRate,
  onOpen,
  dismissedIds = new Set(),
  onDismissMovie,
  onAddToList,
}) {
  // Full, unfiltered candidate pool: { movie, score, sources, reason }[]
  const [candidatePool, setCandidatePool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moodId, setMoodId] = useState(null);
  const [watchableOnly, setWatchableOnly] = useState(false);

  const hasRatings = Object.values(ratedMovies).some((m) => m.rating > 0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    buildCandidatePool(ratedMovies, dismissedIds)
      .then((pool) => {
        if (!cancelled) setCandidatePool(pool);
      })
      .catch(() => {
        if (!cancelled) setCandidatePool([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasRatings,
    JSON.stringify(
      Object.values(ratedMovies)
        .filter((m) => m.rating > 0)
        .map((m) => m.id)
    ),
  ]);

  const heading = hasRatings ? "Recommended for You" : "Popular Movies";

  const reasonsByMovieId = Object.fromEntries(
    candidatePool.map((entry) => [entry.movie.id, entry.reason])
  );

  const poolMovies = candidatePool
    .filter((entry) => !dismissedIds.has(entry.movie.id))
    .map((entry) => entry.movie);
  const moodFiltered = filterByMood(poolMovies, moodId);

  const { filtered: watchable, loading: providerLoading } = useProviderFilter(
    moodFiltered,
    services,
    watchableOnly
  );

  const finalMovies = (watchableOnly ? watchable : moodFiltered).slice(
    0,
    DISPLAY_LIMIT
  );

  let emptyMessage = null;
  if (moodId && watchableOnly) {
    emptyMessage = "Nothing matches this mood on your selected services.";
  } else if (moodId) {
    emptyMessage = "Nothing matches this mood right now — try another.";
  } else if (watchableOnly) {
    emptyMessage = "Nothing matches your selected services right now.";
  } else {
    emptyMessage = hasRatings
      ? "No recommendations found yet."
      : "Couldn't load trending movies right now.";
  }

  if (ratingsLoading) {
    return (
      <section>
        <div className="h-6 w-48 rounded bg-surface animate-pulse mb-4" />
        <PosterGridSkeleton />
      </section>
    );
  }

  return (
    <section>
      <h2
        className={`text-lg font-medium text-fg-secondary ${
          hasRatings ? "mb-4" : "mb-1"
        }`}
      >
        {heading}
      </h2>

      {!hasRatings && (
        <p className="text-sm text-fg-muted mb-4">
          Rate a few movies to get personalized recommendations.
        </p>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <MoodFilter activeMoodId={moodId} onChange={setMoodId} />
        <WatchableOnlyToggle
          checked={watchableOnly}
          onChange={setWatchableOnly}
          services={services}
          onServicesChange={onServicesChange}
        />
      </div>

      {loading || (watchableOnly && providerLoading) ? (
        <PosterGridSkeleton />
      ) : finalMovies.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {finalMovies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              rating={0}
              onRate={onRate}
              onOpen={onOpen}
              reason={reasonsByMovieId[movie.id]}
              onDismiss={
                onDismissMovie ? (m) => onDismissMovie(m.id) : undefined
              }
              onAddToList={onAddToList}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-fg-muted">
          <p className="text-sm">{emptyMessage}</p>
        </div>
      )}
    </section>
  );
}
