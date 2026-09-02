const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SCRIPT_POLL_MS = 50;
const SCRIPT_TIMEOUT_MS = 10_000;
const MAX_ERROR_RETRIES = 2;

function waitForTurnstileScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (window.turnstile) {
        clearInterval(interval);
        resolve(window.turnstile);
        return;
      }
      if (Date.now() - start > SCRIPT_TIMEOUT_MS) {
        clearInterval(interval);
        reject(new Error("Turnstile script failed to load"));
      }
    }, SCRIPT_POLL_MS);
  });
}

// Solves a single Turnstile challenge and resolves with the token Supabase
// needs as `options.captchaToken` on signInAnonymously(). Renders into a
// small fixed corner widget — normally the "Managed" mode Cloudflare
// widget resolves invisibly with no visitor interaction at all, but a
// risky/new visitor can occasionally get a real checkbox challenge, so it
// has to actually be on-screen and clickable rather than hidden. The
// widget and its container are torn down again once a token comes back
// (or the attempt fails), since this only ever runs once per anonymous
// session.
export function getTurnstileToken() {
  if (!SITE_KEY) {
    return Promise.reject(
      new Error("VITE_TURNSTILE_SITE_KEY is not configured")
    );
  }

  return waitForTurnstileScript().then(
    (turnstile) =>
      new Promise((resolve, reject) => {
        const container = document.createElement("div");
        container.style.position = "fixed";
        container.style.bottom = "16px";
        container.style.right = "16px";
        container.style.zIndex = "9999";
        document.body.appendChild(container);

        const cleanup = (widgetId) => {
          try {
            turnstile.remove(widgetId);
          } catch {
            // Already gone — nothing to clean up.
          }
          container.remove();
        };

        let errorRetries = 0;

        const widgetId = turnstile.render(container, {
          sitekey: SITE_KEY,
          theme: "auto",
          callback: (token) => {
            cleanup(widgetId);
            resolve(token);
          },
          // Cloudflare's own guidance: error-callback often fires for
          // transient reasons (a flaky network request mid-challenge, a
          // content blocker interfering with one asset load, etc.) and the
          // widget can just be reset to retry — it isn't necessarily a
          // hard failure. Only give up and surface an error to the user
          // after a few resets in a row also fail.
          "error-callback": () => {
            errorRetries += 1;
            if (errorRetries <= MAX_ERROR_RETRIES) {
              turnstile.reset(widgetId);
              return;
            }
            cleanup(widgetId);
            reject(new Error("Turnstile challenge failed"));
          },
          "expired-callback": () => {
            turnstile.reset(widgetId);
          },
        });
      })
  );
}
