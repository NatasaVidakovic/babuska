import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;

export const isSupabaseConfigured = Boolean(
  url && publishableKey && !publishableKey.includes("your-local-anon-key"),
);

// A placeholder keeps the visual frontend usable before a local Supabase stack is started.
// It never has write access; real credentials are injected through .env.local/Vercel.
export const supabase = createClient(
  url ?? "http://127.0.0.1:54321",
  publishableKey ?? "sb_publishable_local_placeholder",
);
