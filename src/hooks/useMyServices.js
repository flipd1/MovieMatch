import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export function useMyServices(userId) {
  const [services, setServicesState] = useState([]);
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
        .select("services")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      setServicesState(data?.services ?? []);
    } catch {
      setServicesState([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const setServices = useCallback(
    async (nextServiceIds) => {
      setServicesState(nextServiceIds);
      if (!isSupabaseConfigured || !userId) return;

      try {
        const { error } = await supabase
          .from("preferences")
          .upsert(
            { user_id: userId, services: nextServiceIds },
            { onConflict: "user_id" }
          );
        if (error) throw error;
      } catch {
        load();
      }
    },
    [userId, load]
  );

  return { services, setServices, loading };
}
