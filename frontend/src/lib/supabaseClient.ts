import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// Returns null when env vars are absent (local dev without .env, CI, etc.).
// All auth consumers must handle a null client gracefully — public pages must
// remain fully functional whether or not the Supabase config is present.
export const supabase: SupabaseClient | null =
  url && publishableKey ? createClient(url, publishableKey) : null;
