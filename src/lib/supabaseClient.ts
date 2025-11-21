import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Creates (or reuses) a client-side Supabase instance that is safe to use in the browser.
 * Always ensure that Row Level Security policies protect data since the anon key is public.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  // Fallbacks ensure we never crash the client bundle if env injection is missing at runtime.
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://xtprcqvzpezaahumuewn.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cHJjcXZ6cGV6YWFodW11ZXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNzI1NzAsImV4cCI6MjA3ODc0ODU3MH0.ZNJqW3y2JifWbCet6UVZ93fNFOZkD2FZWAMYzCOtzOo";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables for browser client");
  }

  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
    },
  });

  return browserClient;
}
