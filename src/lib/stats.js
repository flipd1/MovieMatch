import { GENRE_NAMES } from "./tmdb";

// Pure number-crunching for the "Your Stats" page. Takes the same
// `ratedMovies` shape useRatedMovies() returns ({ [movieId]: { rating,
// genre_ids, ratedAt, vote_average, ... } }) and derives everything the
// page displays. Kept separate from the component so the math is easy to
// reason about (and test) without rendering anything.

export function ratedYears(ratedMovies) {
  const years = new Set(
    Object.values(ratedMovies).map((m) => new Date(m.ratedAt).getFullYear())
  );
  return Array.from(years).sort((a, b) => b - a);
}

function moviesForYear(ratedMovies, year) {
  const all = Object.values(ratedMovies);
  if (year === "all") return all;
  return all.filter((m) => new Date(m.ratedAt).getFullYear() === year);
}

// Count of rated movies per calendar year, most recent first — for the
// "broken down by year" bar chart. Always computed across all years
// regardless of the selected year filter.
export function countsByYear(ratedMovies) {
  const counts = new Map();
  Object.values(ratedMovies).forEach((m) => {
    const year = new Date(m.ratedAt).getFullYear();
    counts.set(year, (counts.get(year) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, count]) => ({ year, count }));
}

// Per-genre movie count and average user rating, sorted by count
// descending (ties broken by average rating). Only genres with at least
// one rated movie in the selected scope appear.
export function genreBreakdown(ratedMovies, year = "all") {
  const byGenre = new Map();

  moviesForYear(ratedMovies, year).forEach((m) => {
    (m.genre_ids ?? []).forEach((genreId) => {
      const entry = byGenre.get(genreId) ?? { count: 0, ratingSum: 0 };
      entry.count += 1;
      entry.ratingSum += m.rating;
      byGenre.set(genreId, entry);
    });
  });

  return Array.from(byGenre.entries())
    .map(([genreId, { count, ratingSum }]) => ({
      genreId,
      name: GENRE_NAMES[genreId] ?? "Other",
      count,
      avgRating: ratingSum / count,
    }))
    .sort((a, b) => b.count - a.count || b.avgRating - a.avgRating);
}

// Highest- and lowest-rated movie in the selected scope. Ties broken by
// most recently rated. Returns null for either when there's nothing rated.
export function extremes(ratedMovies, year = "all") {
  const movies = moviesForYear(ratedMovies, year);
  if (!movies.length) return { highest: null, lowest: null };

  const sorted = [...movies].sort(
    (a, b) => b.rating - a.rating || b.ratedAt - a.ratedAt
  );

  return { highest: sorted[0], lowest: sorted[sorted.length - 1] };
}

// "You rated Horror 15% higher than the general audience" — compares the
// user's average rating (scaled 1-5 -> 0-10 to match TMDB's vote_average)
// against TMDB's own vote_average for the same movies, per genre. Only
// genres where at least one rated movie has a cached vote_average are
// included, since TMDB doesn't guarantee that field is populated.
export function audienceComparison(ratedMovies, year = "all") {
  const byGenre = new Map();

  moviesForYear(ratedMovies, year).forEach((m) => {
    if (!m.vote_average) return;
    (m.genre_ids ?? []).forEach((genreId) => {
      const entry = byGenre.get(genreId) ?? { userSum: 0, tmdbSum: 0, count: 0 };
      entry.userSum += m.rating * 2;
      entry.tmdbSum += m.vote_average;
      entry.count += 1;
      byGenre.set(genreId, entry);
    });
  });

  return Array.from(byGenre.entries())
    .map(([genreId, { userSum, tmdbSum, count }]) => {
      const userAvg = userSum / count;
      const tmdbAvg = tmdbSum / count;
      return {
        genreId,
        name: GENRE_NAMES[genreId] ?? "Other",
        count,
        userAvg,
        tmdbAvg,
        percentDiff: ((userAvg - tmdbAvg) / tmdbAvg) * 100,
      };
    })
    .filter((entry) => entry.count >= 2)
    .sort((a, b) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff));
}

function averageRating(movies) {
  if (!movies.length) return 0;
  return movies.reduce((sum, m) => sum + m.rating, 0) / movies.length;
}

// Everything the shareable summary card needs, bundled together.
export function shareSummary(ratedMovies, year = "all") {
  const movies = moviesForYear(ratedMovies, year);
  const genres = genreBreakdown(ratedMovies, year);
  const topGenre = genres[0]?.name ?? null;
  const label = year === "all" ? "All-Time" : String(year);

  return {
    label,
    count: movies.length,
    topGenre,
    avgRating: averageRating(movies),
  };
}

export function shareText(summary) {
  const { label, count, topGenre, avgRating } = summary;
  const genrePart = topGenre ? `, mostly ${topGenre}` : "";
  return `${label} in Movies: ${count} film${count === 1 ? "" : "s"}${genrePart}, average rating ${avgRating.toFixed(1)}★ — via MovieMatch`;
}
