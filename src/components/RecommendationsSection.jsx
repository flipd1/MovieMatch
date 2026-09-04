import { useEffect, useState } from "react";
import { buildCandidatePool } from "../lib/candidatePool";
import { filterByMood } from "../lib/moods";
import { filterByGenres } from "../lib/genreFilter";
import { sortMovies } from "../lib/sortMovies";
import { useProviderFilter } from "../hooks/useProviderFilter";
import { useDirectorFilter } from "../hooks/useDirectorFilter";
import MovieCard from "./MovieCard";
import MoodFilter from "./MoodFilter";
import GenreFilter from "./GenreFilter";
import DirectorFilter from "./DirectorFilter";
import SortControl from "./SortControl";
import WatchableOnlyToggle from "./WatchableOnlyToggle";
import MobileFiltersSheet from "./MobileFiltersSheet";

const DISPLAY_LIMIT = 20;

function PosterGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
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
  const [selectedGenreIds, setSelectedGenreIds] = useState([]);
  const [selectedDirector, setSelectedDirector] = useState(null);
  const [watchableOnly, setWatchableOnly] = useState(false);
  const [sortId, setSortId] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { directedMovieIds, loading: directorLoading } = useDirectorFilter(
    selectedDirector?.id ?? null
  );

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
  const genreFiltered = filterByGenres(moodFiltered, selectedGenreIds);
  const directorFiltered =
    selectedDirector && directedMovieIds
      ? genreFiltered.filter((movie) => directedMovieIds.has(movie.id))
      : genreFiltered;

  const { filtered: watchable, loading: providerLoading } = useProviderFilter(
    directorFiltered,
    services,
    watchableOnly
  );

  const filteredMovies = watchableOnly ? watchable : directorFiltered;
  const finalMovies = sortMovies(filteredMovies, sortId).slice(
    0,
    DISPLAY_LIMIT
  );

  const activeFilters = [];
  if (moodId) activeFilters.push("mood");
  if (selectedGenreIds.length) activeFilters.push("genre");
  if (selectedDirector) activeFilters.push("director");
  if (watchableOnly) activeFilters.push("your services");

  const refineFilterCount =
    (selectedGenreIds.length ? 1 : 0) +
    (selectedDirector ? 1 : 0) +
    (watchableOnly ? 1 : 0);

  const emptyMessage = activeFilters.length
    ? `Nothing matches your filters (${activeFilters.join(", ")}) right now — try adjusting them.`
    : hasRatings
      ? "No recommendations found yet."
      : "Couldn't load trending movies right now.";

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
        className={`text-xl font-semibold sm:text-lg sm:font-medium text-fg-secondary ${
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

      <div className="mb-5">
        {/* "Vibe" row — mood pills, horizontally scrollable on mobile. */}
        <MoodFilter activeMoodId={moodId} onChange={setMoodId} />

        {/* "Refine" row (desktop) — Genre/Director/Sort grouped on the
            left, watchable-only inlined on the right of the same row,
            visually separated from the mood pills above by a divider. */}
        <div className="hidden sm:flex items-center justify-between flex-wrap gap-4 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-3 flex-wrap">
            <GenreFilter
              selectedGenreIds={selectedGenreIds}
              onChange={setSelectedGenreIds}
            />
            <DirectorFilter
              selected={selectedDirector}
              onSelect={setSelectedDirector}
            />
            <SortControl sortId={sortId} onChange={setSortId} />
          </div>
          <WatchableOnlyToggle
            checked={watchableOnly}
            onChange={setWatchableOnly}
            services={services}
            onServicesChange={onServicesChange}
          />
        </div>

        {/* Refine controls (mobile) — Genre/Director/watchable collapsed
            into one "Filters" button that opens a bottom sheet, but Sort
            by stays out here next to it since it's not really a "filter"
            (nothing gets excluded, just reordered) and is reached for
            often enough to deserve its own visible control. */}
        <div className="sm:hidden flex items-center gap-3 mt-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border border-border-strong text-fg-muted hover:text-fg hover:border-fg-faint transition-colors cursor-pointer"
          >
            <svg
              viewBox="0 0 20 20"
              className="w-3.5 h-3.5 fill-none stroke-current stroke-2"
            >
              <path
                d="M3 5h14M6 10h8M8.5 15h3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Filters
            {refineFilterCount > 0 && (
              <span className="flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-amber-400 text-black text-[10px] font-bold">
                {refineFilterCount}
              </span>
            )}
          </button>
          <SortControl sortId={sortId} onChange={setSortId} />
        </div>
      </div>

      {mobileFiltersOpen && (
        <MobileFiltersSheet onClose={() => setMobileFiltersOpen(false)}>
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-fg-muted">
                Genre
              </p>
              <GenreFilter
                selectedGenreIds={selectedGenreIds}
                onChange={setSelectedGenreIds}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-fg-muted">
                Director
              </p>
              <DirectorFilter
                selected={selectedDirector}
                onSelect={setSelectedDirector}
              />
            </div>
            <div className="pt-1 border-t border-border">
              <WatchableOnlyToggle
                checked={watchableOnly}
                onChange={setWatchableOnly}
                services={services}
                onServicesChange={onServicesChange}
              />
            </div>
          </div>
        </MobileFiltersSheet>
      )}

      {loading ||
      (watchableOnly && providerLoading) ||
      (selectedDirector && directorLoading) ? (
        <PosterGridSkeleton />
      ) : finalMovies.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
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
