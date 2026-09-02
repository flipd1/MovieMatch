// Curated list of major US streaming services with their TMDB watch-provider IDs.
export const STREAMING_SERVICES = [
  { id: 8, name: "Netflix" },
  { id: 9, name: "Prime Video" },
  { id: 337, name: "Disney+" },
  { id: 15, name: "Hulu" },
  { id: 1899, name: "Max" },
  { id: 350, name: "Apple TV+" },
  { id: 531, name: "Paramount+" },
  { id: 386, name: "Peacock" },
];

const REGION = "US";
const providerEntryCache = new Map();

// Fetches (and caches, since these rarely change within a session) a
// movie's US watch-provider entry — { flatrate, ads, free, link, ... } —
// for the "watchable on my services" filter and Watch Tonight matching.
export function getCachedProviderEntry(movieId, fetchWatchProviders) {
  if (!providerEntryCache.has(movieId)) {
    providerEntryCache.set(
      movieId,
      fetchWatchProviders(movieId)
        .then((data) => data?.results?.[REGION] ?? null)
        .catch(() => null)
    );
  }
  return providerEntryCache.get(movieId);
}

// Shared scope for "is this actually streamable" — flatrate/ads/free only.
// buy/rent are intentionally excluded: they're never part of the
// isAvailableOnAnyService decision, so surfacing them elsewhere would imply
// an availability match that doesn't exist.
function scopedProviders(entry) {
  return [
    ...(entry?.flatrate ?? []),
    ...(entry?.ads ?? []),
    ...(entry?.free ?? []),
  ];
}

export function extractProviderIds(entry) {
  return scopedProviders(entry).map((p) => p.provider_id);
}

export function isAvailableOnAnyService(providerIds, selectedServiceIds) {
  if (!selectedServiceIds?.length) return true;
  return providerIds.some((id) => selectedServiceIds.includes(id));
}

// Full provider objects (id/name/logo) from providerEntry's flatrate/ads/free
// scope that are in the user's selected services — i.e. the exact provider(s)
// that caused this movie to pass isAvailableOnAnyService. Deduped by
// provider_id (a provider can appear in multiple categories) and sorted by
// TMDB's display_priority.
export function getMatchingProviders(providerEntry, selectedServiceIds) {
  const seen = new Map();
  for (const p of scopedProviders(providerEntry)) {
    if (selectedServiceIds?.includes(p.provider_id) && !seen.has(p.provider_id)) {
      seen.set(p.provider_id, p);
    }
  }
  return [...seen.values()].sort(
    (a, b) => (a.display_priority ?? 0) - (b.display_priority ?? 0)
  );
}
