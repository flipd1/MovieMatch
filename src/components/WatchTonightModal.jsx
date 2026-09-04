import { useEffect, useState } from "react";
import {
  getMovieVideos,
  getWatchProviders,
  logoUrl,
  posterUrl,
  yearFromDate,
} from "../lib/tmdb";
import { buildCandidatePool } from "../lib/candidatePool";
import { useMovieRuntime } from "../hooks/useMovieRuntime";
import {
  extractProviderIds,
  getCachedProviderEntry,
  getMatchingProviders,
  isAvailableOnAnyService,
} from "../lib/providers";
import ServiceCheckboxes from "./ServiceCheckboxes";
import StarRating from "./StarRating";

const LOW_MATCH_THRESHOLD = 5;

export default function WatchTonightModal({
  ratedMovies,
  services,
  onRate,
  onClose,
  dismissedIds = new Set(),
}) {
  const [selected, setSelected] = useState(services);
  const [step, setStep] = useState("select");
  const [queue, setQueue] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [trailer, setTrailer] = useState(null);
  const [trailerLoading, setTrailerLoading] = useState(false);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const toggleService = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleFind = async () => {
    setStep("loading");

    // Same shared candidate pool as "Recommended for You" (60-100+ movies
    // from the user's top rated titles' recommendations/similar, padded
    // with genre discovery), so filtering by service has enough to work
    // with instead of collapsing to 1-2 options.
    const pool = await buildCandidatePool(ratedMovies, dismissedIds).catch(
      () => []
    );

    const withProviders = await Promise.all(
      pool.map((entry) =>
        getCachedProviderEntry(entry.movie.id, getWatchProviders).then(
          (providerEntry) => ({
            ...entry,
            providerEntry,
            providerIds: extractProviderIds(providerEntry),
          })
        )
      )
    );

    const matches = withProviders.filter(({ providerIds }) =>
      isAvailableOnAnyService(providerIds, selected)
    );

    if (!matches.length) {
      setQueue([]);
      setStep("empty");
      return;
    }

    // Randomize among matches so repeated "Surprise Me" runs vary, while
    // still favoring higher taste-match scores.
    const shuffled = [...matches].sort(
      (a, b) => b.score + Math.random() * 2 - (a.score + Math.random() * 2)
    );

    setQueue(shuffled);
    setCursor(0);
    setStep("result");
  };

  const current = queue[cursor];
  const matchingProviders = current
    ? getMatchingProviders(current.providerEntry, selected)
    : [];
  const runtime = useMovieRuntime(current?.movie.id);

  // The candidate pool's movie objects (from discover/similar/recommendations
  // endpoints) don't include videos — fetch the trailer the same way
  // MovieDetail does, per movie, so "Show Me Another" swaps it out too.
  useEffect(() => {
    if (!current) {
      setTrailer(null);
      return;
    }

    let cancelled = false;
    setTrailer(null);
    setTrailerLoading(true);

    getMovieVideos(current.movie.id)
      .then((videos) => {
        if (cancelled) return;
        const officialTrailer =
          videos.results?.find(
            (v) => v.type === "Trailer" && v.site === "YouTube" && v.official
          ) ??
          videos.results?.find(
            (v) => v.type === "Trailer" && v.site === "YouTube"
          );
        setTrailer(officialTrailer ?? null);
      })
      .catch(() => {
        if (!cancelled) setTrailer(null);
      })
      .finally(() => {
        if (!cancelled) setTrailerLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [current?.movie.id]);

  const handleShowAnother = () => {
    setCursor((c) => (c + 1) % queue.length);
  };

  const backdrop = current?.movie.backdrop_path
    ? posterUrl(current.movie.backdrop_path, "w1280")
    : current?.movie.poster_path
      ? posterUrl(current.movie.poster_path, "w780")
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/85 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-surface-strong rounded-xl overflow-hidden ring-1 ring-border my-auto"
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

        {step === "select" && (
          <div className="p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-fg mb-1">
                Watch Tonight
              </h2>
              <p className="text-sm text-fg-secondary">
                Which services do you have? We&apos;ll pick something you can
                actually watch right now.
              </p>
            </div>
            <ServiceCheckboxes selected={selected} onToggle={toggleService} />
            <button
              type="button"
              onClick={handleFind}
              disabled={!selected.length}
              className="w-full bg-amber-400 hover:bg-amber-300 disabled:bg-surface-muted disabled:text-fg-faint disabled:cursor-not-allowed text-black font-medium rounded-lg py-3 transition-colors cursor-pointer"
            >
              Surprise Me
            </button>
            {!selected.length && (
              <p className="text-xs text-fg-faint text-center">
                Select at least one service to continue.
              </p>
            )}
          </div>
        )}

        {step === "loading" && (
          <div className="py-24 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-fg-muted">Finding something great…</p>
          </div>
        )}

        {step === "empty" && (
          <div className="p-8 py-24 text-center space-y-4">
            <p className="text-fg-secondary text-sm font-medium">
              Couldn&apos;t find a match on those services right now.
            </p>
            <p className="text-fg-muted text-sm">
              Try selecting a few more streaming services.
            </p>
            <button
              type="button"
              onClick={() => setStep("select")}
              className="text-sm font-medium bg-fill hover:bg-fill-hover text-fg rounded-lg px-4 py-2 transition-colors cursor-pointer"
            >
              Back
            </button>
          </div>
        )}

        {step === "result" && current && (
          <>
            <div className="relative aspect-video w-full bg-surface">
              {backdrop && (
                <img
                  src={backdrop}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-surface-strong via-surface-strong/20 to-transparent" />
            </div>

            <div className="px-6 sm:px-8 pb-8 -mt-16 relative space-y-5">
              <div>
                <h2 className="text-2xl sm:text-3xl font-semibold text-fg leading-tight">
                  {current.movie.title}
                </h2>
                <p className="text-sm text-fg-muted mt-1">
                  {yearFromDate(current.movie.release_date)}
                  {runtime && ` · ${runtime}`}
                </p>
              </div>

              {matchingProviders.length > 0 && (
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">
                    Watch on
                  </span>
                  {matchingProviders.map((provider) => (
                    <span
                      key={provider.provider_id}
                      className="flex items-center gap-1.5 bg-fill rounded-full pl-1 pr-3 py-1"
                    >
                      {provider.logo_path ? (
                        <img
                          src={logoUrl(provider.logo_path)}
                          alt={provider.provider_name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          className="w-6 h-6 rounded-full bg-surface-muted"
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-xs font-medium text-fg">
                        {provider.provider_name}
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {current.movie.overview && (
                <p className="text-fg-secondary text-sm leading-relaxed">
                  {current.movie.overview}
                </p>
              )}

              <div className="flex items-center gap-3">
                <StarRating
                  rating={ratedMovies[current.movie.id]?.rating ?? 0}
                  size="lg"
                  onRate={(r) => onRate(current.movie, r)}
                />
              </div>

              {trailerLoading ? (
                <div className="aspect-video w-full rounded-lg bg-surface animate-pulse" />
              ) : (
                trailer && (
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
                )
              )}

              {queue.length < LOW_MATCH_THRESHOLD && (
                <p className="text-xs text-accent-fg">
                  Only {queue.length} match{queue.length === 1 ? "" : "es"} on
                  your selected services. Try selecting more services for
                  better picks.
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href={current.providerEntry?.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center bg-amber-400 hover:bg-amber-300 text-black font-medium rounded-lg py-3 transition-colors"
                >
                  Watch This
                </a>
                <button
                  type="button"
                  onClick={handleShowAnother}
                  disabled={queue.length <= 1}
                  className="flex-1 bg-fill hover:bg-fill-hover disabled:opacity-40 disabled:cursor-not-allowed text-fg font-medium rounded-lg py-3 transition-colors cursor-pointer"
                >
                  Show Me Another
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
