// Shared "taste profile" scoring used by Recommendations, In Theaters, and
// Watch Tonight: a genre -> weight map built from the user's rating history,
// weighted by star rating so a 5-star movie's genres count more than a
// 2-star one's.
export function buildGenreProfile(ratedMovies) {
  const profile = {};
  Object.values(ratedMovies).forEach((m) => {
    if (!m.rating || !m.genre_ids?.length) return;
    m.genre_ids.forEach((genreId) => {
      profile[genreId] = (profile[genreId] ?? 0) + m.rating;
    });
  });
  return profile;
}

export function scoreByGenreOverlap(movie, profile) {
  return (movie.genre_ids ?? []).reduce(
    (sum, genreId) => sum + (profile[genreId] ?? 0),
    0
  );
}

// Highest-weighted genre IDs in a profile, for padding the candidate pool
// via /discover/movie.
export function topGenreIds(profile, count = 3) {
  return Object.entries(profile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([genreId]) => Number(genreId));
}

// For candidates that weren't pulled in via a specific rated movie's
// recommendations/similar list (e.g. genre-discovery padding), fall back to
// a genre-based explanation using whichever of the movie's genres the user
// weights most heavily.
export function genreReason(movie, profile, genreNames) {
  const best = (movie.genre_ids ?? [])
    .filter((id) => profile[id] > 0)
    .sort((a, b) => profile[b] - profile[a])[0];
  if (best === undefined) return null;
  const name = genreNames[best];
  return name ? `Matches your taste in ${name}` : null;
}
