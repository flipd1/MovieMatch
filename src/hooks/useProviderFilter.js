import { useEffect, useState } from "react";
import { getWatchProviders } from "../lib/tmdb";
import {
  extractProviderIds,
  getCachedProviderEntry,
  isAvailableOnAnyService,
} from "../lib/providers";

// Filters a movie list down to titles available on at least one of the
// user's selected streaming services. Only fetches watch-provider data
// (bounded to the current list, cached across calls) when the filter is on.
export function useProviderFilter(movies, selectedServiceIds, enabled) {
  const [providerMap, setProviderMap] = useState({});
  const [loading, setLoading] = useState(false);

  const movieIdsKey = movies.map((m) => m.id).join(",");

  useEffect(() => {
    if (!enabled || !movies.length) return;

    let cancelled = false;
    setLoading(true);

    Promise.all(
      movies.map((m) =>
        getCachedProviderEntry(m.id, getWatchProviders).then((entry) => [
          m.id,
          extractProviderIds(entry),
        ])
      )
    )
      .then((entries) => {
        if (!cancelled) setProviderMap(Object.fromEntries(entries));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, movieIdsKey]);

  if (!enabled) {
    return { filtered: movies, loading: false };
  }

  const filtered = movies.filter((m) =>
    isAvailableOnAnyService(providerMap[m.id] ?? [], selectedServiceIds)
  );

  return { filtered, loading };
}
