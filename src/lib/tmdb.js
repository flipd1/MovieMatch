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

export function getMovieDetails(movieId) {
  return tmdbFetch(`/movie/${movieId}`);
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
