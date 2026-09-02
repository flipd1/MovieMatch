import { useMemo, useState } from "react";
import { posterUrl, yearFromDate } from "../lib/tmdb";
import {
  audienceComparison,
  countsByYear,
  extremes,
  genreBreakdown,
  ratedYears,
  shareSummary,
} from "../lib/stats";
import ProLockedPreview from "./ProLockedPreview";
import ShareCard from "./ShareCard";

const TOP_GENRE_COUNT = 5;

function YearSelector({ years, selected, onChange }) {
  if (years.length < 2) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
          selected === "all"
            ? "bg-fg text-bg"
            : "bg-surface text-fg-muted hover:text-fg border border-border"
        }`}
      >
        All Time
      </button>
      {years.map((year) => (
        <button
          key={year}
          type="button"
          onClick={() => onChange(year)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            selected === year
              ? "bg-fg text-bg"
              : "bg-surface text-fg-muted hover:text-fg border border-border"
          }`}
        >
          {year}
        </button>
      ))}
    </div>
  );
}

function YearBreakdownChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-3 h-32">
      {data.map(({ year, count }) => (
        <div key={year} className="flex flex-col items-center gap-1.5 flex-1">
          <span className="text-xs font-medium text-fg-secondary">
            {count}
          </span>
          <div
            className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-amber-500 to-amber-300"
            style={{ height: `${Math.max((count / max) * 88, 6)}px` }}
          />
          <span className="text-xs text-fg-muted">{year}</span>
        </div>
      ))}
    </div>
  );
}

function GenreBars({ genres }) {
  const max = Math.max(...genres.map((g) => g.count), 1);
  return (
    <div className="space-y-3">
      {genres.slice(0, TOP_GENRE_COUNT).map((g) => (
        <div key={g.genreId}>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-sm font-medium text-fg">{g.name}</span>
            <span className="text-xs text-fg-muted">
              {g.count} movie{g.count === 1 ? "" : "s"} &middot; avg{" "}
              {g.avgRating.toFixed(1)}★
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
              style={{ width: `${(g.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ExtremeCard({ label, movie }) {
  if (!movie) return null;
  const poster = posterUrl(movie.poster_path);

  return (
    <div className="flex items-center gap-3 bg-surface rounded-xl ring-1 ring-border p-3">
      <div className="w-14 aspect-[2/3] rounded-md overflow-hidden bg-surface-muted shrink-0">
        {poster ? (
          <img src={poster} alt={movie.title} className="w-full h-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-fg-muted mb-0.5">
          {label}
        </p>
        <p className="text-sm font-medium text-fg leading-tight truncate">
          {movie.title}
        </p>
        <p className="text-xs text-fg-muted">
          {yearFromDate(movie.release_date)} &middot; {movie.rating}★
        </p>
      </div>
    </div>
  );
}

function AudienceComparisonList({ entries }) {
  if (!entries.length) return null;

  return (
    <ul className="space-y-2">
      {entries.slice(0, 4).map((entry) => {
        const higher = entry.percentDiff >= 0;
        return (
          <li
            key={entry.genreId}
            className="text-sm text-fg-secondary flex items-start gap-2"
          >
            <span className={higher ? "text-emerald-500" : "text-rose-500"}>
              {higher ? "▲" : "▼"}
            </span>
            <span>
              You rated <span className="font-medium text-fg">{entry.name}</span>{" "}
              {Math.abs(entry.percentDiff).toFixed(0)}%{" "}
              {higher ? "higher" : "lower"} than the general audience.
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function StatsContent({ ratedMovies }) {
  const years = useMemo(() => ratedYears(ratedMovies), [ratedMovies]);
  const [selectedYear, setSelectedYear] = useState(years[0] ?? "all");

  const yearCounts = useMemo(() => countsByYear(ratedMovies), [ratedMovies]);
  const genres = useMemo(
    () => genreBreakdown(ratedMovies, selectedYear),
    [ratedMovies, selectedYear]
  );
  const { highest, lowest } = useMemo(
    () => extremes(ratedMovies, selectedYear),
    [ratedMovies, selectedYear]
  );
  const comparison = useMemo(
    () => audienceComparison(ratedMovies, selectedYear),
    [ratedMovies, selectedYear]
  );
  const summary = useMemo(
    () => shareSummary(ratedMovies, selectedYear),
    [ratedMovies, selectedYear]
  );

  return (
    <div className="space-y-10">
      <div className="rounded-2xl bg-gradient-to-br from-amber-400/20 via-surface to-surface border border-amber-400/30 p-6 sm:p-8 space-y-1">
        <p className="text-sm font-medium text-amber-500">
          {summary.label} in Movies
        </p>
        <p className="text-4xl sm:text-5xl font-bold text-fg">
          {summary.count} film{summary.count === 1 ? "" : "s"}
        </p>
        {summary.topGenre && (
          <p className="text-fg-secondary">
            Mostly <span className="font-medium text-fg">{summary.topGenre}</span>{" "}
            &middot; average rating {summary.avgRating.toFixed(1)}★
          </p>
        )}
      </div>

      <YearSelector years={years} selected={selectedYear} onChange={setSelectedYear} />

      {yearCounts.length > 1 && (
        <section>
          <h3 className="text-sm font-medium text-fg-secondary mb-4">
            Rated by Year
          </h3>
          <YearBreakdownChart data={yearCounts} />
        </section>
      )}

      {genres.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-fg-secondary mb-4">
            Top Genres
          </h3>
          <GenreBars genres={genres} />
        </section>
      )}

      {(highest || lowest) && (
        <section>
          <h3 className="text-sm font-medium text-fg-secondary mb-4">
            Highs &amp; Lows
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ExtremeCard label="Highest Rated" movie={highest} />
            <ExtremeCard label="Lowest Rated" movie={lowest} />
          </div>
        </section>
      )}

      {comparison.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-fg-secondary mb-4">
            You vs. the Audience
          </h3>
          <AudienceComparisonList entries={comparison} />
        </section>
      )}

      <section>
        <h3 className="text-sm font-medium text-fg-secondary mb-4">
          Share Your Wrapped
        </h3>
        <ShareCard summary={summary} />
      </section>
    </div>
  );
}

const SAMPLE_RATED_MOVIES = {
  1: { id: 1, title: "Sample", rating: 5, genre_ids: [18], ratedAt: Date.now(), poster_path: null, release_date: "2024-01-01", vote_average: 7.2 },
  2: { id: 2, title: "Sample", rating: 4, genre_ids: [28], ratedAt: Date.now(), poster_path: null, release_date: "2024-01-01", vote_average: 6.8 },
  3: { id: 3, title: "Sample", rating: 3, genre_ids: [35], ratedAt: Date.now(), poster_path: null, release_date: "2024-01-01", vote_average: 6.1 },
};

export default function StatsSection({ ratedMovies, isPro, onGoToSettings }) {
  const hasRatings = Object.keys(ratedMovies).length > 0;

  if (!isPro) {
    return (
      <ProLockedPreview
        onUnlock={onGoToSettings}
        title="Your Stats is a Pro feature"
        description="Unlock your year-by-year breakdown, top genres, best and worst rated picks, and a shareable wrapped-style summary card."
      >
        <StatsContent ratedMovies={SAMPLE_RATED_MOVIES} />
      </ProLockedPreview>
    );
  }

  if (!hasRatings) {
    return (
      <div className="text-center py-16 text-fg-muted">
        <p className="text-sm">
          Rate a few movies to see your stats here.
        </p>
      </div>
    );
  }

  return <StatsContent ratedMovies={ratedMovies} />;
}
