import { supabase } from "./supabase";

export const IMAGE_BASE = "https://image.tmdb.org/t/p";

// Every TMDB call goes through the tmdb-proxy Edge Function instead of
// hitting api.themoviedb.org directly — the TMDB bearer token lives only
// as a Supabase secret on the server side, never in this bundle. The
// Supabase gateway requires a valid session JWT to invoke the function at
// all (supabase-js attaches the current user's — including anonymous —
// session automatically), and the function itself rate-limits by IP on
// top of that.
async function tmdbFetch(path, params = {}) {
  const cleanParams = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      cleanParams[key] = String(value);
    }
  });

  const { data, error } = await supabase.functions.invoke("tmdb-proxy", {
    body: { path, params: cleanParams },
  });

  if (error) {
    throw new Error(`TMDB proxy request failed: ${error.message}`);
  }

  return data;
}

export function posterUrl(path, size = "w342") {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

export function logoUrl(path, size = "w92") {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

export function searchMovies(query, page = 1) {
  if (!query?.trim()) return Promise.resolve({ results: [] });
  return tmdbFetch("/search/movie", { query, page, include_adult: false });
}

export function getRecommendations(movieId, page = 1) {
  return tmdbFetch(`/movie/${movieId}/recommendations`, { page });
}

export function getSimilarMovies(movieId, page = 1) {
  return tmdbFetch(`/movie/${movieId}/similar`, { page });
}

export function getDiscoverMovies({ genreIds, page = 1 } = {}) {
  return tmdbFetch("/discover/movie", {
    with_genres: genreIds?.join(","),
    sort_by: "popularity.desc",
    "vote_count.gte": 50,
    page,
  });
}

// Standard TMDB movie genre list (stable, well-known IDs) — used to build
// human-readable "matches your taste" text without an extra fetch.
export const GENRE_NAMES = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

export function getTrendingMovies(page = 1) {
  return tmdbFetch("/trending/movie/week", { page });
}

export function getNowPlayingMovies(page = 1) {
  return tmdbFetch("/movie/now_playing", { page, region: "US" });
}

// Widely-seen, well-established popular movies — the seed list for a
// brand-new user with nothing rated yet. Deliberately NOT "trending this
// week": trending skews toward whatever's currently in theaters or about
// to release, which a new user is unlikely to have seen yet, defeating
// the point of a first-rating prompt. A release-date cutoff a year back
// plus a high vote-count floor biases toward movies enough people have
// actually watched to have an opinion on.
const WIDELY_SEEN_WINDOW_YEARS = 1;

export function getWidelySeenMovies(page = 1) {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - WIDELY_SEEN_WINDOW_YEARS);

  return tmdbFetch("/discover/movie", {
    sort_by: "popularity.desc",
    "vote_count.gte": 1000,
    "vote_average.gte": 6,
    "primary_release_date.lte": cutoff.toISOString().slice(0, 10),
    page,
  });
}

// Recent theatrical/digital releases currently streaming on the given
// providers. TMDB has no "date added to service" field, so this is
// necessarily an approximation: movies released in the last ~3 months that
// happen to be available (flatrate/ads/free) on one of the given providers
// right now — not a feed of what was just added this week.
const NEW_RELEASES_WINDOW_MONTHS = 3;

export function getNewReleases({ providerIds, sortBy = "primary_release_date.desc", page = 1 } = {}) {
  const today = new Date();
  const windowStart = new Date(today);
  windowStart.setMonth(windowStart.getMonth() - NEW_RELEASES_WINDOW_MONTHS);

  const isoDate = (d) => d.toISOString().slice(0, 10);

  return tmdbFetch("/discover/movie", {
    with_watch_providers: providerIds?.join("|"),
    watch_region: "US",
    region: "US",
    "primary_release_date.gte": isoDate(windowStart),
    "primary_release_date.lte": isoDate(today),
    sort_by: sortBy,
    "vote_count.gte": 10,
    page,
  });
}

export function getWatchProviders(movieId) {
  return tmdbFetch(`/movie/${movieId}/watch/providers`);
}

export function searchPeople(query, page = 1) {
  if (!query?.trim()) return Promise.resolve({ results: [] });
  return tmdbFetch("/search/person", { query, page, include_adult: false });
}

export function getPersonMovieCredits(personId) {
  return tmdbFetch(`/person/${personId}/movie_credits`);
}

// The director/actor filters need "every movie this person directed/acted
// in", which is far cheaper as one /person/{id}/movie_credits request than
// fetching /movie/{id}/credits for every candidate movie just to check who
// worked on it. Each relation gets its own cache, keyed by person id, since
// picking the same person again (even across sections, or switching between
// the director and actor filter) shouldn't refetch.
function createPersonMovieIdsCache(extractIds) {
  const cache = new Map();
  return function getCachedIds(personId) {
    if (!cache.has(personId)) {
      cache.set(
        personId,
        getPersonMovieCredits(personId)
          .then(extractIds)
          .catch(() => new Set())
      );
    }
    return cache.get(personId);
  };
}

export const getCachedDirectedMovieIds = createPersonMovieIdsCache(
  (data) =>
    new Set(
      (data.crew ?? [])
        .filter((credit) => credit.job === "Director")
        .map((credit) => credit.id)
    )
);

export const getCachedActedMovieIds = createPersonMovieIdsCache(
  (data) => new Set((data.cast ?? []).map((credit) => credit.id))
);

export function getMovieDetails(movieId) {
  return tmdbFetch(`/movie/${movieId}`);
}

const movieDetailsCache = new Map();

// Cached full movie-details fetch, keyed by movie id — list/search/discover
// endpoints never include `runtime` (only the single-movie /movie/{id}
// endpoint does), so card-level runtime display needs its own fetch per
// movie. Every card showing the same movie (across grids, and later the
// detail modal) shares one cached request instead of refetching, which
// matters here since a single grid can render dozens of cards at once.
export function getCachedMovieDetails(movieId) {
  if (!movieDetailsCache.has(movieId)) {
    movieDetailsCache.set(
      movieId,
      getMovieDetails(movieId).catch(() => null)
    );
  }
  return movieDetailsCache.get(movieId);
}

export function getMovieCredits(movieId) {
  return tmdbFetch(`/movie/${movieId}/credits`);
}

export function getMovieVideos(movieId) {
  return tmdbFetch(`/movie/${movieId}/videos`);
}

export function yearFromDate(dateStr) {
  if (!dateStr) return "";
  return dateStr.slice(0, 4);
}

export function formatReleaseDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRuntime(minutes) {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
