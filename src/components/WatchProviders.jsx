import { useEffect, useState } from "react";
import { getWatchProviders, logoUrl } from "../lib/tmdb";

const REGION = "US";

export default function WatchProviders({ movieId }) {
  const [providers, setProviders] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setProviders(null);

    getWatchProviders(movieId)
      .then((data) => {
        if (!cancelled) setProviders(data?.results?.[REGION] ?? null);
      })
      .catch(() => {
        if (!cancelled) setProviders(null);
      });

    return () => {
      cancelled = true;
    };
  }, [movieId]);

  const options = providers?.flatrate ?? providers?.ads ?? providers?.free;

  if (!providers || !options?.length) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      {options.slice(0, 4).map((provider) => (
        <img
          key={provider.provider_id}
          src={logoUrl(provider.logo_path)}
          alt={provider.provider_name}
          title={provider.provider_name}
          className="w-6 h-6 rounded-md object-cover"
        />
      ))}
    </div>
  );
}
