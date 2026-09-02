import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

// Real Supabase anonymous auth, replacing the old client-generated
// anon_id. On first visit this calls supabase.auth.signInAnonymously(),
// which gives the browser a genuine session with a server-verified
// identity (auth.uid()) — one the client cannot spoof or hand to another
// row by editing a request payload, unlike the old plain-UUID column.
// The session itself is persisted by supabase-js in localStorage, so
// returning visits reuse it instead of signing in again.
//
// Linking an email is entirely optional (see AccountSection): calling
// updateUser({ email }) sends a confirmation link but does NOT flip
// is_anonymous until the user actually clicks it, so the anonymous
// identity — and its data — keeps working unchanged in the meantime.
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

    async function init() {
      const { data } = await supabase.auth.getSession();

      if (data.session?.user) {
        if (!cancelled) {
          setUser(data.session.user);
          setLoading(false);
        }
        return;
      }

      const { data: signInData, error: signInError } =
        await supabase.auth.signInAnonymously();

      if (cancelled) return;

      if (signInError) {
        setError(signInError);
        setLoading(false);
        return;
      }

      setUser(signInData.session?.user ?? null);
      setLoading(false);
    }

    init();

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

  return {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    isAnonymous: user?.is_anonymous ?? true,
    loading,
    error,
    linkEmail,
    resendLinkEmail,
  };
}
