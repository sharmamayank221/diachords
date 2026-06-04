import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export function useFavorites(chordId: string, chordKey: string, chordSuffix: string) {
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !chordId) return;
    supabase
      .from("user_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("chord_id", chordId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("[useFavorites] fetch error:", error);
        else setIsFavorited(!!data);
      });
  }, [user, chordId]);

  const toggle = useCallback(async () => {
    if (!user) return false;
    setLoading(true);
    setError(null);
    if (isFavorited) {
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("chord_id", chordId);
      if (error) {
        console.error("[useFavorites] delete error:", error);
        setError(error.message);
      } else {
        setIsFavorited(false);
      }
    } else {
      const { error } = await supabase
        .from("user_favorites")
        .insert({ user_id: user.id, chord_id: chordId, chord_key: chordKey, chord_suffix: chordSuffix });
      if (error) {
        console.error("[useFavorites] insert error:", error);
        setError(error.message);
      } else {
        setIsFavorited(true);
      }
    }
    setLoading(false);
    return true;
  }, [user, chordId, chordKey, chordSuffix, isFavorited]);

  return { isFavorited, toggle, loading, error };
}
