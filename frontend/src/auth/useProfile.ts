import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

export type Profile = {
  id: string;
  email: string;
  language: string;
  theme: string;
  created_at: string;
  updated_at: string;
};

type UseProfileResult = {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
};

/**
 * Fetches the public.profiles row for the given authenticated user.
 *
 * Returns { profile: null, isLoading: false, error: null } immediately when:
 *   • the Supabase client is not configured (missing env vars), or
 *   • user is null (guest browsing).
 *
 * All setState calls live inside async .then()/.catch() callbacks — no
 * synchronous setState in the effect body. isLoading is lazily initialised
 * to true only when both supabase and a user are present at mount time.
 */
export function useProfile(user: User | null): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  // Start in loading state only when there is both a client and a user to
  // fetch for. Otherwise begin settled — mirrors the AuthProvider pattern.
  const [isLoading, setIsLoading] = useState(
    () => supabase !== null && user !== null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No client or no user — nothing to fetch. State starts (or remains)
    // settled from the lazy initialiser; no synchronous setState needed.
    if (!supabase || !user) return;

    let cancelled = false;

    // Async IIFE keeps all setState calls inside an async callback, which
    // satisfies the react-hooks/set-state-in-effect lint rule (only
    // synchronous setState at the top level of the effect body is flagged).
    (async () => {
      try {
        const { data, error: sbError } = await supabase
          .from("profiles")
          .select("id, email, language, theme, created_at, updated_at")
          .eq("id", user.id)
          .single();

        if (cancelled) return;

        if (sbError) {
          // PGRST116 = "no rows returned" — profile row doesn't exist yet
          // (user pre-dates this migration). Treat as null, not a hard error.
          setProfile(null);
          setError(sbError.code === "PGRST116" ? null : sbError.message);
        } else {
          setProfile(data as Profile);
          setError(null);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setProfile(null);
        setError(
          err instanceof Error ? err.message : "Failed to load profile.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // When there is no user, always return a stable settled empty state,
  // regardless of whatever internal state may remain from a previous fetch.
  if (!supabase || !user) {
    return { profile: null, isLoading: false, error: null };
  }

  return { profile, isLoading, error };
}
