import { useEffect, useState } from "react";
import {
  formatRuntime,
  getMovieCredits,
  getMovieDetails,
  getMovieVideos,
  posterUrl,
  yearFromDate,
} from "../lib/tmdb";
import StarRating from "./StarRating";
import WatchProviders from "./WatchProviders";

export default function MovieDetail({
  movieId,
  rating = 0,
  onRate,
  onClose,
  reason,
  onAddToList,
}) {
  const [details, setDetails] = useState(null);
  const [cast, setCast] = useState([]);
  const [trailer, setTrailer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDetails(null);
    setCast([]);
    setTrailer(null);

    Promise.all([
      getMovieDetails(movieId),
      getMovieCredits(movieId).catch(() => ({ cast: [] })),
      getMovieVideos(movieId).catch(() => ({ results: [] })),
    ])
      .then(([movie, credits, videos]) => {
        if (cancelled) return;
        setDetails(movie);
        setCast((credits.cast ?? []).slice(0, 6));

        const officialTrailer =
          videos.results?.find(
            (v) => v.type === "Trailer" && v.site === "YouTube" && v.official
          ) ??
          videos.results?.find(
            (v) => v.type === "Trailer" && v.site === "YouTube"
          );
        setTrailer(officialTrailer ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [movieId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const backdrop = details?.backdrop_path
    ? posterUrl(details.backdrop_path, "w1280")
    : null;
  const poster = details?.poster_path ? posterUrl(details.poster_path) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-surface-strong rounded-xl overflow-hidden ring-1 ring-border my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
        >
          <svg
            viewBox="0 0 20 20"
            className="w-4 h-4 fill-none stroke-current stroke-2"
          >
            <line x1="4" y1="4" x2="16" y2="16" />
            <line x1="16" y1="4" x2="4" y2="16" />
          </svg>
        </button>

        {loading ? (
          <div className="aspect-video w-full bg-surface animate-pulse" />
        ) : !details ? (
          <div className="py-24 text-center text-fg-muted text-sm">
            Couldn&apos;t load this movie. Try again later.
          </div>
        ) : (
          <>
            <div className="relative aspect-video w-full bg-surface">
              {backdrop ? (
                <img
                  src={backdrop}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : poster ? (
                <img
                  src={poster}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-surface-strong via-surface-strong/20 to-transparent" />
            </div>

            <div className="px-6 sm:px-8 pb-8 -mt-16 relative space-y-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-semibold text-fg leading-tight">
                  {details.title}
                </h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-sm text-fg-muted">
                  <span>{yearFromDate(details.release_date)}</span>
                  {details.runtime > 0 && (
                    <>
                      <span>&middot;</span>
                      <span>{formatRuntime(details.runtime)}</span>
                    </>
                  )}
                  {details.genres?.length > 0 && (
                    <>
                      <span>&middot;</span>
                      <span>
                        {details.genres.map((g) => g.name).join(", ")}
                      </span>
                    </>
                  )}
                </div>
                {reason && (
                  <p className="text-accent-fg text-sm italic mt-2">
                    {reason}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs uppercase tracking-wide text-fg-muted">
                    Your Rating
                  </span>
                  <StarRating
                    rating={rating}
                    size="lg"
                    onRate={(r) => onRate(details, r)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  {onAddToList && (
                    <button
                      type="button"
                      onClick={() => onAddToList(details)}
                      className="flex items-center gap-1.5 text-sm font-medium bg-fill hover:bg-fill-hover text-fg rounded-lg px-3 py-2 transition-colors cursor-pointer"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        className="w-4 h-4 fill-none stroke-current stroke-2"
                      >
                        <path d="M10 4.5v11M4.5 10h11" strokeLinecap="round" />
                      </svg>
                      Add to List
                    </button>
                  )}
                  <WatchProviders movieId={details.id} />
                </div>
              </div>

              {details.overview && (
                <p className="text-fg-secondary text-sm leading-relaxed">
                  {details.overview}
                </p>
              )}

              {cast.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-fg-secondary mb-3">
                    Cast
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {cast.map((actor) => {
                      const headshot = posterUrl(actor.profile_path, "w185");
                      return (
                        <div key={actor.id} className="text-center">
                          <div className="aspect-square rounded-full overflow-hidden bg-surface-muted mb-1.5">
                            {headshot ? (
                              <img
                                src={headshot}
                                alt={actor.name}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-fg-faint text-xs">
                                {actor.name?.[0]}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-fg-secondary leading-tight line-clamp-2">
                            {actor.name}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {trailer && (
                <div>
                  <h3 className="text-sm font-medium text-fg-secondary mb-3">
                    Trailer
                  </h3>
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
                    <iframe
                      key={trailer.key}
                      src={`https://www.youtube.com/embed/${trailer.key}`}
                      title={trailer.name}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
