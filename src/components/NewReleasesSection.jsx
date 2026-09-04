import { useEffect, useState } from "react";
import { formatReleaseDate, getNewReleases } from "../lib/tmdb";
import { filterByMood } from "../lib/moods";
import { filterByGenres } from "../lib/genreFilter";
import { sortMovies } from "../lib/sortMovies";
import { useDirectorFilter } from "../hooks/useDirectorFilter";
import { useActorFilter } from "../hooks/useActorFilter";
import MovieCard from "./MovieCard";
import MoodFilter from "./MoodFilter";
import GenreFilter from "./GenreFilter";
import DirectorFilter from "./DirectorFilter";
import ActorFilter from "./ActorFilter";
import SortControl from "./SortControl";
import ServiceCheckboxes from "./ServiceCheckboxes";
import MobileFiltersSheet from "./MobileFiltersSheet";

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
  const [selectedActor, setSelectedActor] = useState(null);
  const [sortId, setSortId] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [draftServices, setDraftServices] = useState(services);

  const { directedMovieIds, loading: directorLoading } = useDirectorFilter(
    selectedDirector?.id ?? null
  );
  const { actedMovieIds, loading: actorLoading } = useActorFilter(
    selectedActor?.id ?? null
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
  const actorFiltered =
    selectedActor && actedMovieIds
      ? directorFiltered.filter((movie) => actedMovieIds.has(movie.id))
      : directorFiltered;
  const displayMovies = sortMovies(actorFiltered, sortId);

  const activeFilters = [];
  if (moodId) activeFilters.push("mood");
  if (selectedGenreIds.length) activeFilters.push("genre");
  if (selectedDirector) activeFilters.push("director");
  if (selectedActor) activeFilters.push("actor");

  const emptyMessage = activeFilters.length
    ? `Nothing matches your filters (${activeFilters.join(", ")}) right now — try adjusting them.`
    : "No recent releases found on your selected services right now.";

  const refineFilterCount =
    (selectedGenreIds.length ? 1 : 0) +
    (selectedDirector ? 1 : 0) +
    (selectedActor ? 1 : 0);

  return (
    <>
      <div className="mb-4">
        <p className="text-sm text-fg-muted">
          Recently released, now streaming — movies from the last few months
          that are currently available on your services.
        </p>
      </div>

      <div className="mb-5">
        {/* "Vibe" row — mood pills, horizontally scrollable on mobile. */}
        <MoodFilter activeMoodId={moodId} onChange={setMoodId} />

        {/* "Refine" row (desktop) — Genre/Director/Actor/Sort grouped
            together, visually separated from the mood pills above by a
            divider — same pattern as Rate & Discover. */}
        <div className="hidden sm:flex items-center gap-3 flex-wrap mt-4 pt-4 border-t border-border">
          <GenreFilter
            selectedGenreIds={selectedGenreIds}
            onChange={setSelectedGenreIds}
          />
          <DirectorFilter
            selected={selectedDirector}
            onSelect={setSelectedDirector}
          />
          <ActorFilter
            selected={selectedActor}
            onSelect={setSelectedActor}
          />
          <SortControl sortId={sortId} onChange={setSortId} />
        </div>

        {/* Refine controls (mobile) — Genre/Director/Actor collapsed into
            one "Filters" button that opens a bottom sheet; Sort by stays
            visible next to it since it's not really a "filter". */}
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
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-fg-muted">
                Actor
              </p>
              <ActorFilter
                selected={selectedActor}
                onSelect={setSelectedActor}
              />
            </div>
          </div>
        </MobileFiltersSheet>
      )}

      {loading ||
      (selectedDirector && directorLoading) ||
      (selectedActor && actorLoading) ? (
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
