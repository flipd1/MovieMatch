import {
  GENRE_NAMES,
  getDiscoverMovies,
  getRecommendations,
  getSimilarMovies,
  getWidelySeenMovies,
} from "./tmdb";
import { buildGenreProfile, genreReason, topGenreIds } from "./taste";

// Rather than always seeding from the exact same fixed top-N rated movies,
// pick a random 5-6 from the user's top 15 — weighted toward higher
// ratings, but not deterministic — so which movies drive a given
// recommendation pass (and therefore which movies show up) varies across
// visits instead of the same handful appearing every time.
export const SEED_POOL_SIZE = 15;
const MIN_SEEDS = 5;
const MAX_SEEDS = 6;

export const MIN_VOTE_COUNT = 50;
const DISCOVER_PAGES = 2;
const WIDELY_SEEN_PAGES = 2;

// How much random "jitter" to add to each candidate's score before the
// final sort. Real scores are integers (1 per source that recommended a
// movie) or 0.5 (genre-discovery padding with no direct source), so a
// jitter under 1 only ever reorders candidates that were tied or adjacent
// in score — it won't push a clearly-better match below a clearly-worse
// one, just stops the same top handful from always landing in the exact
// same order/row.
const SCORE_JITTER = 0.75;

function buildSourceReason(sources) {
  if (!sources?.length) return null;
  const top = [...sources].sort(
    (a, b) => b.rating - a.rating || b.ratedAt - a.ratedAt
  )[0];
  return `Because you rated ${top.title} ${top.rating} star${
    top.rating > 1 ? "s" : ""
  }`;
}

// Efraimidis-Spirakis weighted random sampling without replacement: each
// item gets a key = U^(1/weight) for U ~ Uniform(0,1); taking the top-`count`
// keys picks higher-weighted items more often without ever guaranteeing
// any single one, and without needing to normalize weights into a
// probability distribution first.
function weightedSample(items, weightFn, count) {
  const keyed = items.map((item) => ({
    item,
    key: Math.pow(Math.random(), 1 / Math.max(weightFn(item), 0.001)),
  }));
  keyed.sort((a, b) => b.key - a.key);
  return keyed.slice(0, count).map((k) => k.item);
}

function pickSeedMovies(ratedMovies) {
  const candidates = Object.values(ratedMovies)
    .filter((m) => m.rating > 0)
    .sort((a, b) => b.rating - a.rating || b.ratedAt - a.ratedAt)
    .slice(0, SEED_POOL_SIZE);

  if (candidates.length <= MIN_SEEDS) return candidates;

  const seedCount = Math.min(
    candidates.length,
    MIN_SEEDS + Math.floor(Math.random() * (MAX_SEEDS - MIN_SEEDS + 1))
  );

  return weightedSample(candidates, (m) => m.rating, seedCount);
}

// The single shared candidate pool used by "Recommended for You", its
// mood/service filters, and Watch Tonight: recommendations + similar movies
// for a randomly-weighted subset of the user's top rated movies, padded
// with genre-based discovery to reach a pool large enough (60-100+) for
// filters to meaningfully differ. Falls back to trending pages when the
// user hasn't rated anything yet. Movies the user dismissed ("Not
// Interested") are excluded entirely. Returns
// { movie, score, sources, reason }[], sorted by relevance score
// descending with light randomization among close scores (unfiltered by
// mood/service — callers apply that themselves).
export async function buildCandidatePool(ratedMovies, dismissedIds = new Set()) {
  const topRated = pickSeedMovies(ratedMovies);

  if (!topRated.length) {
    // A brand-new user has nothing to seed recommendations from, so this
    // is really a "give them something to rate" list, not a
    // recommendation — widely-seen popular movies from at least a year
    // back (see getWidelySeenMovies), not this week's trending/in-theaters
    // buzz, which skews toward movies a new user likely hasn't seen yet
    // and so can't actually rate.
    const pages = await Promise.all(
      Array.from({ length: WIDELY_SEEN_PAGES }, (_, i) =>
        getWidelySeenMovies(i + 1).catch(() => ({ results: [] }))
      )
    );
    const seen = new Map();
    pages.forEach((page) => {
      (page.results ?? []).forEach((movie) => {
        if (dismissedIds.has(movie.id)) return;
        if (!seen.has(movie.id)) seen.set(movie.id, movie);
      });
    });
    return Array.from(seen.values()).map((movie) => ({
      movie,
      score: 0,
      sources: [],
      reason: null,
    }));
  }

  const profile = buildGenreProfile(ratedMovies);
  const topGenres = topGenreIds(profile, 3);

  const sourceGroups = await Promise.all(
    topRated.map((source) =>
      Promise.all([
        getRecommendations(source.id).catch(() => ({ results: [] })),
        getSimilarMovies(source.id).catch(() => ({ results: [] })),
      ]).then(([recs, similar]) => {
        const merged = new Map();
        [...(recs.results ?? []), ...(similar.results ?? [])].forEach(
          (movie) => merged.set(movie.id, movie)
        );
        return { source, movies: Array.from(merged.values()) };
      })
    )
  );

  const discoverPages = topGenres.length
    ? await Promise.all(
        Array.from({ length: DISCOVER_PAGES }, (_, i) =>
          getDiscoverMovies({ genreIds: topGenres, page: i + 1 }).catch(
            () => ({ results: [] })
          )
        )
      )
    : [];

  const scored = new Map();

  sourceGroups.forEach(({ source, movies }) => {
    movies.forEach((movie) => {
      if (ratedMovies[movie.id]) return;
      if (dismissedIds.has(movie.id)) return;
      if ((movie.vote_count ?? 0) < MIN_VOTE_COUNT) return;

      const existing = scored.get(movie.id);
      if (existing) {
        existing.score += 1;
        existing.sources.push(source);
      } else {
        scored.set(movie.id, { movie, score: 1, sources: [source] });
      }
    });
  });

  discoverPages.forEach((page) => {
    (page.results ?? []).forEach((movie) => {
      if (ratedMovies[movie.id]) return;
      if (dismissedIds.has(movie.id)) return;
      if ((movie.vote_count ?? 0) < MIN_VOTE_COUNT) return;
      if (scored.has(movie.id)) return;
      scored.set(movie.id, { movie, score: 0.5, sources: [] });
    });
  });

  return Array.from(scored.values())
    .map((entry) => ({
      ...entry,
      reason: entry.sources.length
        ? buildSourceReason(entry.sources)
        : genreReason(entry.movie, profile, GENRE_NAMES),
    }))
    .sort((a, b) => {
      const jitteredDiff =
        b.score + Math.random() * SCORE_JITTER -
        (a.score + Math.random() * SCORE_JITTER);
      if (jitteredDiff !== 0) return jitteredDiff;
      return (b.movie.vote_average ?? 0) - (a.movie.vote_average ?? 0);
    });
}
