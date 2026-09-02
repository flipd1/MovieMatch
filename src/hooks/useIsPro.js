import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

// Gates Pro-only features (currently just "Your Stats"). There's no
// payment provider integrated yet, so this reads a plain boolean the user
// can flip themselves in Settings — a placeholder for a real
// subscription check later, not a paywall today.
export function useIsPro(userId) {
  const [isPro, setIsProState] = useState(false);
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
        .select("is_pro")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      setIsProState(data?.is_pro ?? false);
    } catch {
      setIsProState(false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const setIsPro = useCallback(
    async (nextIsPro) => {
      setIsProState(nextIsPro);
      if (!isSupabaseConfigured || !userId) return;

      try {
        const { error } = await supabase
          .from("preferences")
          .upsert(
            { user_id: userId, is_pro: nextIsPro },
            { onConflict: "user_id" }
          );
        if (error) throw error;
      } catch {
        load();
      }
    },
    [userId, load]
  );

  return { isPro, setIsPro, loading };
}
