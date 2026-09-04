import { useMovieRuntime } from "../hooks/useMovieRuntime";

// Renders " · 1h 49m" (or nothing, while loading/unavailable) — a small
// standalone component (rather than calling the hook inline) so it can be
// used inside a .map() over search results without violating the rules of
// hooks.
export default function MovieRuntime({ movieId, separator = " · " }) {
  const runtime = useMovieRuntime(movieId);
  if (!runtime) return null;
  return (
    <>
      {separator}
      {runtime}
    </>
  );
}
