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
// Creating a real account (see AccountSection) is entirely optional:
// calling updateUser({ email, password }) upgrades the CURRENT anonymous
// session in place — same user_id, so every row already keyed to it
// (ratings, preferences, lists) just keeps working, nothing to migrate.
// If the project requires confirming a new email address, is_anonymous
// stays true until that link is clicked; the password itself is set
// immediately either way.

// Module-scoped so the initial sign-in flow (including the Turnstile
// challenge) only ever runs ONCE per page load, no matter how many times
// the effect below fires. This matters because React's StrictMode
// intentionally double-invokes effects in development: without this
// guard, that ran init() twice, rendering two separate Turnstile widgets
// (needing two clicks to clear) AND firing two independent
// signInAnonymously() calls that raced each other. Whichever one resolved
// second silently became the browser's actual persisted session, while
// React state could end up holding the *other* call's user — so every
// write after that sent a user_id that didn't match the session's real
// auth.uid(), and Row Level Security quietly rejected it. A `cancelled`
// flag alone can't fix this: it only stops a stale effect run from
// calling setState, not from having already fired a second real sign-in
// request. Reset to null by signOut() below, so signing out and back in
// as a fresh anonymous user goes through this same guarded path again.
let authInitPromise = null;

async function signInAnonymouslyWithCaptcha() {
  // Supabase's Attack Protection requires a Turnstile token on every
  // sign-in now, anonymous ones included — without this,
  // signInAnonymously() below fails outright.
  const captchaToken = await getTurnstileToken();

  const { data, error } = await supabase.auth.signInAnonymously({
    options: { captchaToken },
  });
  if (error) throw error;

  return data.session?.user ?? null;
}

function initAuth() {
  if (!authInitPromise) {
    authInitPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) return data.session.user;
      return signInAnonymouslyWithCaptcha();
    })();
  }
  return authInitPromise;
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

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
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      // Fired when the session came from clicking a password-reset email
      // link — the app needs to show a "set new password" form rather
      // than just quietly signing this (temporary, limited) session in.
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Upgrades the current anonymous session into a real account in place —
  // same user_id, so ratings/preferences/lists already tied to it keep
  // working unchanged. Returns whether the account is fully active yet:
  // if the project requires confirming the new email, it stays anonymous
  // until that link is clicked even though the password is already set.
  const createAccount = useCallback(async ({ email, password }) => {
    const { data, error: updateError } = await supabase.auth.updateUser(
      { email, password },
      { emailRedirectTo: window.location.origin }
    );
    if (updateError) return { error: updateError, isAnonymous: true };
    return { error: null, isAnonymous: data.user?.is_anonymous ?? true };
  }, []);

  // Signs in with an existing account's email + password — the "new
  // device" path. This REPLACES whatever session is currently active; see
  // AccountSection for the confirmation step that runs first when the
  // current (anonymous) session already has its own local ratings, so
  // that data isn't switched away from silently.
  const signIn = useCallback(async ({ email, password }) => {
    let captchaToken;
    try {
      captchaToken = await getTurnstileToken();
    } catch (captchaError) {
      return { error: captchaError };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });
    return { error: signInError };
  }, []);

  // Ends the current (real) session and starts a brand-new anonymous one
  // right away, so the app keeps working with zero friction for whoever
  // uses this browser next — same as a first-ever visit.
  const signOut = useCallback(async () => {
    setLoading(true);
    await supabase.auth.signOut();
    authInitPromise = null;

    try {
      const nextUser = await initAuth();
      setUser(nextUser);
    } catch (signOutError) {
      setError(signOutError);
    } finally {
      setLoading(false);
    }
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    let captchaToken;
    try {
      captchaToken = await getTurnstileToken();
    } catch (captchaError) {
      return { error: captchaError };
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: window.location.origin, captchaToken }
    );
    return { error: resetError };
  }, []);

  // Used after landing on the site via a password-reset email link (see
  // isPasswordRecovery above) to actually set the new password.
  const updatePassword = useCallback(async (newPassword) => {
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (!updateError) setIsPasswordRecovery(false);
    return { error: updateError };
  }, []);

  const dismissPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  return {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    isAnonymous: user?.is_anonymous ?? true,
    loading,
    error,
    isPasswordRecovery,
    createAccount,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
    dismissPasswordRecovery,
  };
}
