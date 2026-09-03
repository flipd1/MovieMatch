import MovieCard from "./MovieCard";

export default function RatedMoviesGrid({
  movies,
  onRate,
  onOpen,
  onRemove,
  onAddToList,
}) {
  if (!movies.length) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-16">
        <svg
          viewBox="0 0 24 24"
          className="w-10 h-10 fill-none stroke-fg-faint stroke-[1.5]"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.98 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
        <p className="text-fg-secondary text-sm font-medium">
          No rated movies yet
        </p>
        <p className="text-fg-muted text-sm max-w-xs">
          Search for a movie above and give it a star rating to start
          building your collection.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
      {movies.map((movie) => (
        <MovieCard
          key={movie.id}
          movie={movie}
          rating={movie.rating}
          onRate={onRate}
          onOpen={onOpen}
          onRemove={onRemove ? () => onRemove(movie) : undefined}
          onAddToList={onAddToList}
        />
      ))}
    </div>
  );
}
