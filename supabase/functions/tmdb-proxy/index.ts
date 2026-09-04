// Proxies TMDB API requests so the TMDB access token never reaches the
// browser. Deploy with `supabase functions deploy tmdb-proxy` (default JWT
// verification stays ON — see README in this folder) and set the token via
// `supabase secrets set TMDB_ACCESS_TOKEN=...`, never a VITE_* variable.
//
// The frontend calls this via
//   supabase.functions.invoke("tmdb-proxy", { body: { path, params } })
// which the Supabase gateway only accepts from a request carrying a valid
// session JWT (anonymous sessions included) — unauthenticated requests are
// rejected before this code ever runs. On top of that, a basic per-IP rate
// limit below caps abuse of this still-technically-public endpoint even by
// callers who do have a valid session.

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_ACCESS_TOKEN = Deno.env.get("TMDB_ACCESS_TOKEN");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Best-effort, per-instance rate limit. Edge Function instances are
// ephemeral and can run in multiple regions, so this isn't a perfectly
// globally-consistent limiter — a truly distributed one would need an
// external store (a Postgres table, Redis, etc.) and the added latency of
// a round trip on every single request. Given this endpoint sits in front
// of essentially every movie/poster/provider lookup in the app (a single
// screen can legitimately fire 100+ calls at once, e.g. building the
// recommendations candidate pool), paying that extra round trip on every
// request isn't worth it just to block casual abuse — an in-memory window
// per warm instance is enough for that, while a genuinely distributed
// attacker would need a different mitigation layer entirely (e.g. Supabase
// project-level rate limiting / a WAF) regardless of what this function
// does internally.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 300;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  recent.push(now);
  requestLog.set(ip, recent);

  // Bound memory on a long-lived warm instance: periodically drop IPs with
  // no requests inside the current window.
  if (requestLog.size > 5000) {
    for (const [key, times] of requestLog) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) {
        requestLog.delete(key);
      }
    }
  }

  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

// Every path the frontend actually calls (src/lib/tmdb.js). Without this,
// any caller with a valid session — anonymous sessions included — could
// use this function as a free, token-authenticated proxy to arbitrary
// TMDB endpoints, burning the shared API quota on requests the app itself
// never makes. Extend this list (not the check below) when tmdb.js grows
// a new endpoint.
const ALLOWED_PATHS = [
  /^\/search\/movie$/,
  /^\/discover\/movie$/,
  /^\/trending\/movie\/week$/,
  /^\/movie\/now_playing$/,
  /^\/movie\/\d+$/,
  /^\/movie\/\d+\/recommendations$/,
  /^\/movie\/\d+\/similar$/,
  /^\/movie\/\d+\/watch\/providers$/,
  /^\/movie\/\d+\/credits$/,
  /^\/movie\/\d+\/videos$/,
  /^\/search\/person$/,
  /^\/person\/\d+\/movie_credits$/,
];

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATHS.some((pattern) => pattern.test(path));
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Use POST" }, 405);
  }

  if (!TMDB_ACCESS_TOKEN) {
    return jsonResponse({ error: "TMDB_ACCESS_TOKEN is not configured" }, 500);
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return jsonResponse({ error: "Too many requests, slow down." }, 429);
  }

  let body: { path?: string; params?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { path, params } = body;
  if (!path || typeof path !== "string" || !isAllowedPath(path)) {
    return jsonResponse({ error: "Unsupported TMDB path" }, 400);
  }

  const tmdbUrl = new URL(`${TMDB_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      tmdbUrl.searchParams.set(key, String(value));
    }
  }

  let tmdbResponse: Response;
  try {
    tmdbResponse = await fetch(tmdbUrl, {
      headers: {
        Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
        accept: "application/json",
      },
    });
  } catch {
    return jsonResponse({ error: "Couldn't reach TMDB" }, 502);
  }

  const responseText = await tmdbResponse.text();

  return new Response(responseText, {
    status: tmdbResponse.status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
