// List/discover/search-endpoint movies already carry `genre_ids` (unlike
// runtime or credits, no extra fetch is needed) — same basis MoodFilter's
// genre-overlap matching already uses. A movie passes if it has ANY of the
// selected genres (OR within the filter), same convention as mood.
export function filterByGenres(movies, genreIds) {
  if (!genreIds?.length) return movies;
  return movies.filter((movie) =>
    (movie.genre_ids ?? []).some((id) => genreIds.includes(id))
  );
}
