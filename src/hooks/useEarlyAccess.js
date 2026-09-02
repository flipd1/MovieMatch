import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

// Early access ("Beta") flag, layered on top of Pro. Infrastructure only —
// no feature reads this yet. Like useIsPro, this is a plain boolean the
// user can flip themselves in Settings (Pro users only) rather than a real
// entitlements check, since there's no billing/beta-program backend yet.
//
// A beta feature should gate on `isPro && earlyAccess` together (see
// components/BetaGate.jsx), not this flag alone — early access is meant to
// be something Pro users opt into, not a separate tier.
export function useEarlyAccess(userId) {
  const [earlyAccess, setEarlyAccessState] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("preferences")
        .select("early_access")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      setEarlyAccessState(data?.early_access ?? false);
    } catch {
      setEarlyAccessState(false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const setEarlyAccess = useCallback(
    async (nextEarlyAccess) => {
      setEarlyAccessState(nextEarlyAccess);
      if (!isSupabaseConfigured || !userId) return;

      try {
        const { error } = await supabase
          .from("preferences")
          .upsert(
            { user_id: userId, early_access: nextEarlyAccess },
            { onConflict: "user_id" }
          );
        if (error) throw error;
      } catch {
        load();
      }
    },
    [userId, load]
  );

  return { earlyAccess, setEarlyAccess, loading };
}
