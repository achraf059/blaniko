import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  /** True when VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are present. */
  isConfigured: boolean;
  authError: string | null;
  /** Resolves to an error message on failure, or null on success. */
  signInWithEmail: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // Start in loading state only when a Supabase client is available.
  // When config is absent, there's nothing to hydrate — begin as settled.
  const [isLoading, setIsLoading] = useState(() => supabase !== null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      // No Supabase config — isLoading was initialised as false, nothing to do.
      return;
    }

    // Hydrate from the current session (handles page refresh / OAuth redirect).
    // .catch() ensures a network failure or unexpected rejection never leaves
    // isLoading stuck at true, which would block all auth-aware UI indefinitely.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    }).catch(() => {
      setAuthError("Could not reach auth service. Please try again later.");
      setIsLoading(false);
    });

    // Listen for sign-in / sign-out / token refresh events.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string): Promise<string | null> => {
    setAuthError(null);
    if (!supabase) {
      const msg = "Auth is not configured.";
      setAuthError(msg);
      return msg;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // After clicking the magic link the user lands back on /account.
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });
    if (error) {
      setAuthError(error.message);
      return error.message;
    }
    return null;
  }, []);

  const signOut = useCallback(async () => {
    setAuthError(null);
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(error.message);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, session, isLoading, isConfigured: supabase !== null, authError, signInWithEmail, signOut }),
    [user, session, isLoading, authError, signInWithEmail, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
