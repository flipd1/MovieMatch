import MovieCard from "./MovieCard";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function pickRewatchCandidate(ratedMovies) {
  const eligible = Object.values(ratedMovies).filter(
    (m) => m.rating >= 4 && Date.now() - m.ratedAt > ONE_YEAR_MS
  );
  if (!eligible.length) return null;
  return eligible.sort((a, b) => a.ratedAt - b.ratedAt)[0];
}

export default function RewatchReminder({
  ratedMovies,
  onRate,
  onOpen,
  onAddToList,
}) {
  const candidate = pickRewatchCandidate(ratedMovies);
  if (!candidate) return null;

  return (
    <section>
      <h2 className="text-xl font-semibold sm:text-lg sm:font-medium mb-1 text-fg-secondary">
        Revisit This?
      </h2>
      <p className="text-sm text-fg-muted mb-4">
        It&apos;s been a while since you watched{" "}
        <span className="text-fg-secondary">{candidate.title}</span> — still a
        favorite?
      </p>
      <div className="max-w-[160px]">
        <MovieCard
          movie={candidate}
          rating={candidate.rating}
          onRate={onRate}
          onOpen={onOpen}
          onAddToList={onAddToList}
        />
      </div>
    </section>
  );
}
