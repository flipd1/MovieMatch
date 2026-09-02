// Mood -> genre mapping for "Browse by Mood". Filtering/reordering uses
// genre overlap (available instantly from list-endpoint results). Keyword
// IDs are included for each mood (looked up against TMDB's real keyword
// index) as a documented extension point for deeper filtering, but are not
// fetched per-movie today to avoid an N-request fan-out per mood selection.
export const MOODS = [
  {
    id: "light",
    label: "Something Light",
    genres: [35, 10751], // Comedy, Family
    keywords: [],
  },
  {
    id: "cry",
    label: "Need a Cry",
    genres: [18], // Drama
    keywords: [156924], // tearjerker
  },
  {
    id: "background",
    label: "Background Watching",
    genres: [16, 35, 10770], // Animation, Comedy, TV Movie
    keywords: [],
  },
  {
    id: "edge",
    label: "Edge of Your Seat",
    genres: [53, 28, 27], // Thriller, Action, Horror
    keywords: [],
  },
  {
    id: "mindbending",
    label: "Mind-Bending",
    genres: [878, 9648], // Science Fiction, Mystery
    keywords: [275311, 157171, 10854, 12565], // plot twist, nonlinear timeline, time loop, psychological thriller
  },
];

export function scoreByMood(movie, mood) {
  if (!mood) return 0;
  return (movie.genre_ids ?? []).filter((id) => mood.genres.includes(id))
    .length;
}

// Hard filter: only movies that actually match the mood's genres, sorted by
// strength of match. No "fall back to unfiltered" behavior — if nothing in
// the pool matches, this returns an empty array so the UI can show an
// honest empty state instead of silently showing unrelated results.
export function filterByMood(movies, moodId) {
  if (!moodId) return movies;
  const mood = MOODS.find((m) => m.id === moodId);
  if (!mood) return movies;

  return movies
    .map((movie) => ({ movie, score: scoreByMood(movie, mood) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.movie);
}
