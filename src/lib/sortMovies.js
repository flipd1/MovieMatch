export const SORT_OPTIONS = [
  { id: "title-asc", label: "Title (A-Z)" },
  { id: "title-desc", label: "Title (Z-A)" },
  { id: "rating", label: "Highest Rated" },
  { id: "recent", label: "Most Recent" },
];

// "Highest Rated" sorts by TMDB's vote_average for now — a follow-up
// integration will swap in Rotten Tomatoes/IMDb-based scores here instead,
// without changing any caller.
export function sortMovies(movies, sortId) {
  if (!sortId) return movies;
  const sorted = [...movies];

  switch (sortId) {
    case "title-asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "title-desc":
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case "rating":
      return sorted.sort(
        (a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0)
      );
    case "recent":
      return sorted.sort((a, b) =>
        (b.release_date ?? "").localeCompare(a.release_date ?? "")
      );
    default:
      return sorted;
  }
}
