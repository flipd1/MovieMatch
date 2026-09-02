import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { getTurnstileToken } from "../lib/turnstile";

// Real Supabase anonymous auth, replacing the old client-generated
// anon_id. On first visit this calls supabase.auth.signInAnonymously(),
// which gives the browser a genuine session with a server-verified
// identity (auth.uid()) — one the client cannot spoof or hand to another
// row by editing a request payload, unlike the old plain-UUID column.
// The session itself is persisted by supabase-js in localStorage, so
// returning visits reuse it instead of signing in again — a Turnstile
// challenge (see lib/turnstile.js) only ever runs once per browser, right
// before that first anonymous sign-in, not on every visit.
//
// Linking an email is entirely optional (see AccountSection): calling
// updateUser({ email }) sends a confirmation link but does NOT flip
// is_anonymous until the user actually clicks it, so the anonymous
// identity — and its data — keeps working unchanged in the meantime.

// Module-scoped so the sign-in flow (including the Turnstile challenge)
// only ever runs ONCE per page load, no matter how many times the effect
// below fires. This matters because React's StrictMode intentionally
// double-invokes effects in development: without this guard, that ran
// init() twice, rendering two separate Turnstile widgets (needing two
// clicks to clear) AND firing two independent signInAnonymously() calls
// that raced each other. Whichever one resolved second silently became
// the browser's actual persisted session, while React state could end up
// holding the *other* call's user — so every write after that sent a
// user_id that didn't match the session's real auth.uid(), and Row Level
// Security quietly rejected it. A `cancelled` flag alone can't fix this:
// it only stops a stale effect run from calling setState, not from
// having already fired a second real sign-in request.
let authInitPromise = null;

function initAuth() {
  if (!authInitPromise) {
    authInitPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) return data.session.user;

      // Supabase's Attack Protection requires a Turnstile token on every
      // sign-in now, anonymous ones included — without this,
      // signInAnonymously() below fails outright.
      const captchaToken = await getTurnstileToken();

      const { data: signInData, error: signInError } =
        await supabase.auth.signInAnonymously({
          options: { captchaToken },
        });
      if (signInError) throw signInError;

      return signInData.session?.user ?? null;
    })();
  }
  return authInitPromise;
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState(null);

  useEffect(() => {
    // One-time cleanup of the old client-generated ID this hook replaces —
    // nothing reads this key anymore.
    localStorage.removeItem("moviematch.anonId");

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    initAuth()
      .then((initializedUser) => {
        if (!cancelled) {
          setUser(initializedUser);
          setLoading(false);
        }
      })
      .catch((initError) => {
        if (!cancelled) {
          setError(initError);
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Sends a confirmation link to `email`. The user's identity stays
  // anonymous (and every existing row keyed to their uid stays exactly
  // where it is) until they click it — this only starts the process.
  const linkEmail = useCallback(async (email) => {
    const { error: updateError } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: window.location.origin }
    );
    return { error: updateError };
  }, []);

  const resendLinkEmail = useCallback(async (email) => {
    const { error: resendError } = await supabase.auth.resend({
      type: "email_change",
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: resendError };
  }, []);

  // The other half of "link an email": on a *new* device/browser there's
  // no session yet carrying that email, so signs one in with a magic link
  // instead of creating a fresh anonymous identity. shouldCreateUser:
  // false means an email that was never linked anywhere just quietly does
  // nothing (Supabase reports success either way, by design, so this
  // can't be used to probe which emails have an account) rather than
  // spinning up an unrelated new account for it.
  const signInWithEmail = useCallback(async (email) => {
    let captchaToken;
    try {
      captchaToken = await getTurnstileToken();
    } catch (captchaError) {
      return { error: captchaError };
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: false,
        captchaToken,
      },
    });
    return { error: otpError };
  }, []);

  return {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    isAnonymous: user?.is_anonymous ?? true,
    loading,
    error,
    linkEmail,
    resendLinkEmail,
    signInWithEmail,
  };
}
