import { useState } from "react";
import { posterUrl, yearFromDate } from "../lib/tmdb";
import { useMovieRuntime } from "../hooks/useMovieRuntime";
import StarRating from "./StarRating";
import WatchProviders from "./WatchProviders";

export default function MovieCard({
  movie,
  rating = 0,
  onRate,
  onOpen,
  badge,
  dateLabel,
  reason,
  onDismiss,
  onRemove,
  onRemoveFromList,
  onAddToList,
}) {
  const poster = posterUrl(movie.poster_path);
  const [loaded, setLoaded] = useState(false);
  const runtime = useMovieRuntime(movie.id);

  // Dismiss ("Not Interested", in Recommended for You), remove (delete a
  // rating, in Your Rated Movies) and removeFromList (My Lists) all live in
  // the same top-right corner slot — a card only ever gets one of the
  // three depending on which section rendered it, so there's no real
  // conflict between them.
  const cornerAction = onDismiss
    ? {
        onClick: onDismiss,
        label: `Not interested in ${movie.title}`,
        title: "Not interested",
      }
    : onRemove
      ? {
          onClick: onRemove,
          label: `Remove rating for ${movie.title}`,
          title: "Remove rating",
        }
      : onRemoveFromList
        ? {
            onClick: onRemoveFromList,
            label: `Remove ${movie.title} from this list`,
            title: "Remove from list",
          }
        : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(movie, reason)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen?.(movie, reason);
      }}
      className="group relative rounded-lg overflow-hidden bg-surface ring-1 ring-border hover:ring-border-strong transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/60"
    >
      {/* Needs its own `relative` — without it, the badge/date-label/
          rating-badge overlays below (all `absolute`) fall back to the
          outer card div as their positioning context. That was invisible
          while the card's height equaled the poster's height, but once
          the mobile star strip below made the card taller than the
          poster, `bottom-2` etc. started measuring from the new (taller)
          card bottom instead of the poster's, pulling them down into the
          strip. */}
      <div className="relative aspect-[2/3] w-full bg-surface-muted overflow-hidden">
        {poster ? (
          <img
            src={poster}
            alt={movie.title}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
              loaded ? "opacity-100 blur-none" : "opacity-0 blur-md"
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-fg-faint text-sm px-3 text-center">
            {movie.title}
          </div>
        )}

        {/* Everything below sits on top of poster art, so it's force-scoped
            to dark styling regardless of site theme via a local `.dark`
            class — legibility against arbitrary image content matters more
            than matching the page palette here. */}
        <div className="dark">
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

          <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
            <p className="text-white font-medium text-sm leading-tight line-clamp-2 mb-1">
              {movie.title}
            </p>
            <p className="text-neutral-300 text-xs mb-2">
              {yearFromDate(movie.release_date)}
              {runtime && ` · ${runtime}`}
            </p>
            {reason && (
              <p className="text-amber-300/90 text-[10px] italic leading-tight mb-2 line-clamp-2">
                {reason}
              </p>
            )}
            <div className="flex items-center justify-between gap-2">
              <StarRating rating={rating} onRate={(r) => onRate(movie, r)} />
              <div className="flex items-center gap-2">
                {onAddToList && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToList(movie);
                    }}
                    aria-label={`Add ${movie.title} to a list`}
                    title="Add to list"
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      className="w-3.5 h-3.5 stroke-white"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M10 4.5v11M4.5 10h11" />
                    </svg>
                  </button>
                )}
                <WatchProviders movieId={movie.id} />
              </div>
            </div>
          </div>

          {cornerAction && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cornerAction.onClick(movie);
              }}
              aria-label={cornerAction.label}
              title={cornerAction.title}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
            >
              <svg
                viewBox="0 0 20 20"
                className="w-3 h-3 stroke-white"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          )}

          {badge && (
            <div className="absolute top-2 left-2 bg-amber-400 text-black text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-1 group-hover:opacity-0 transition-opacity">
              {badge}
            </div>
          )}

          {dateLabel && (
            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1 group-hover:opacity-0 transition-opacity">
              <span className="text-white text-[10px] font-medium">
                {dateLabel}
              </span>
            </div>
          )}

          {rating > 0 && (
            <div className="hidden sm:flex absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-1.5 py-0.5 items-center gap-0.5 pointer-events-none group-hover:opacity-0 transition-opacity">
              <svg viewBox="0 0 20 20" className="w-3 h-3 fill-amber-400">
                <path d="M10 1.5l2.59 5.25 5.79.84-4.19 4.09.99 5.77L10 14.77l-5.18 2.68.99-5.77L1.62 7.59l5.79-.84L10 1.5z" />
              </svg>
              <span className="text-white text-xs font-medium">
                {rating}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile has no hover to reveal the rating row above, so give it its
          own always-visible, compact strip instead — lets you rate straight
          from the grid without opening the detail modal. Deliberately NOT
          another absolutely-positioned corner pill layered on the poster:
          cards can carry a badge (top-left) AND a date pill (bottom-left)
          at once (e.g. In Theaters' "Matches Your Taste"), and on a narrow
          2-column mobile card there's no corner left that doesn't visually
          collide with one of them. A plain strip below the poster — outside
          that overlay system entirely — can't overlap anything on it.
          Desktop keeps the hover overlay and skips this whole strip. */}
      <div
        className="sm:hidden flex items-center justify-center py-1.5 bg-surface-muted"
        onClick={(e) => e.stopPropagation()}
      >
        <StarRating rating={rating} onRate={(r) => onRate(movie, r)} />
      </div>
    </div>
  );
}
