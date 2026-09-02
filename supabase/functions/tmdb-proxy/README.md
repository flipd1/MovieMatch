# tmdb-proxy

Proxies every TMDB API call so the TMDB access token lives only as a
Supabase secret, never in the frontend bundle. See `index.ts` for what it
does; this file is just the one-time setup.

## Deploy

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started).

```bash
# 1. Install the CLI (skip if already installed)
brew install supabase/tap/supabase

# 2. Log in (opens a browser)
supabase login

# 3. Link this repo to your project (run from the repo root)
supabase link --project-ref hgxavsgqsndtgexelewj

# 4. Deploy the function (keep JWT verification ON — the default — so only
#    requests carrying a valid Supabase session, anonymous sessions
#    included, can invoke it at all)
supabase functions deploy tmdb-proxy

# 5. Set the TMDB token as a secret (get one at
#    https://www.themoviedb.org/settings/api if you don't have one — use
#    the "API Read Access Token", not the v3 API key).
supabase secrets set TMDB_ACCESS_TOKEN="paste-your-tmdb-access-token-here"
```

Already done once for this project — this is only needed again if you're
setting up a new environment or the secret ever needs rotating. The token
does **not** live in `.env` anymore (see the frontend `.env.example`), so
there's no local file to read it from this time.

## Verifying it worked

```bash
supabase secrets list
```

should show `TMDB_ACCESS_TOKEN` in the list (values aren't shown, just the
name — that's expected).

Then reload the app — search, recommendations, movie details, etc. should
all still work exactly as before, just routed through this function instead
of calling TMDB directly.

## Rate limiting

The function keeps a simple in-memory per-IP request count (see the comment
above `RATE_LIMIT_MAX_REQUESTS` in `index.ts` for why this is per-instance
rather than a distributed limiter, and why that tradeoff was chosen). No
extra setup needed — it's active as soon as the function is deployed.
