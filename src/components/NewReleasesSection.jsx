import { useEffect, useState } from "react";
import { formatReleaseDate, getNewReleases } from "../lib/tmdb";
import { filterByMood } from "../lib/moods";
import { filterByGenres } from "../lib/genreFilter";
import { sortMovies } from "../lib/sortMovies";
import { useDirectorFilter } from "../hooks/useDirectorFilter";
import MovieCard from "./MovieCard";
import MoodFilter from "./MoodFilter";
import GenreFilter from "./GenreFilter";
import DirectorFilter from "./DirectorFilter";
import SortControl from "./SortControl";
import ServiceCheckboxes from "./ServiceCheckboxes";

const RELEASE_PAGES = 3;

// TMDB has no "added to service this week" data, so this section is framed
// honestly: recent theatrical/digital releases that happen to be available
// on the user's selected services right now, not a live added-to-Netflix
// feed. Without at least one service selected, "new releases" would just be
// every recent release TMDB knows about — not useful — so we require
// services to be set first, same rule WatchableOnlyToggle applies.
export default function NewReleasesSection({
  ratedMovies,
  onRate,
  onOpen,
  services,
  onServicesChange,
  onAddToList,
}) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moodId, setMoodId] = useState(null);
  const [selectedGenreIds, setSelectedGenreIds] = useState([]);
  const [selectedDirector, setSelectedDirector] = useState(null);
  const [sortId, setSortId] = useState(null);
  const [draftServices, setDraftServices] = useState(services);

  const { directedMovieIds, loading: directorLoading } = useDirectorFilter(
    selectedDirector?.id ?? null
  );

  useEffect(() => {
    setDraftServices(services);
  }, [services]);

  useEffect(() => {
    if (!services.length) {
      setMovies([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all(
      Array.from({ length: RELEASE_PAGES }, (_, i) =>
        getNewReleases({ providerIds: services, page: i + 1 }).catch(() => ({
          results: [],
        }))
      )
    )
      .then((pages) => {
        if (cancelled) return;
        const seen = new Map();
        pages.forEach((page) => {
          (page.results ?? []).forEach((movie) => {
            if (!seen.has(movie.id)) seen.set(movie.id, movie);
          });
        });
        setMovies(Array.from(seen.values()));
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
  }, [services]);

  const toggleDraftService = (id) => {
    setDraftServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  if (!services.length) {
    return (
      <div className="max-w-sm mx-auto text-center py-16 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-fg mb-1">
            Set your streaming services
          </h3>
          <p className="text-sm text-fg-muted">
            New Releases is filtered to what you can actually watch, so
            we&apos;ll need to know which services you have first.
          </p>
        </div>

        <ServiceCheckboxes
          selected={draftServices}
          onToggle={toggleDraftService}
        />

        <button
          type="button"
          onClick={() => onServicesChange(draftServices)}
          disabled={!draftServices.length}
          className="w-full text-sm font-medium bg-amber-400 hover:bg-amber-300 disabled:bg-surface-muted disabled:text-fg-faint disabled:cursor-not-allowed text-black rounded-lg py-2.5 transition-colors cursor-pointer"
        >
          Save Services
        </button>
      </div>
    );
  }

  const moodFiltered = filterByMood(movies, moodId);
  const genreFiltered = filterByGenres(moodFiltered, selectedGenreIds);
  const directorFiltered =
    selectedDirector && directedMovieIds
      ? genreFiltered.filter((movie) => directedMovieIds.has(movie.id))
      : genreFiltered;
  const displayMovies = sortMovies(directorFiltered, sortId);

  const activeFilters = [];
  if (moodId) activeFilters.push("mood");
  if (selectedGenreIds.length) activeFilters.push("genre");
  if (selectedDirector) activeFilters.push("director");

  const emptyMessage = activeFilters.length
    ? `Nothing matches your filters (${activeFilters.join(", ")}) right now — try adjusting them.`
    : "No recent releases found on your selected services right now.";

  return (
    <>
      <div className="mb-4">
        <p className="text-sm text-fg-muted">
          Recently released, now streaming — movies from the last few months
          that are currently available on your services.
        </p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <MoodFilter activeMoodId={moodId} onChange={setMoodId} />
          <GenreFilter
            selectedGenreIds={selectedGenreIds}
            onChange={setSelectedGenreIds}
          />
          <DirectorFilter
            selected={selectedDirector}
            onSelect={setSelectedDirector}
          />
        </div>
        <SortControl sortId={sortId} onChange={setSortId} />
      </div>

      {loading || (selectedDirector && directorLoading) ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-lg bg-surface animate-pulse"
            />
          ))}
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
