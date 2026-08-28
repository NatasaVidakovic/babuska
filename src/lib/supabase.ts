import { createClient } from "@supabase/supabase-js";

const firstConfiguredValue = (...values: unknown[]) =>
  values
    .find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    ?.trim();

const url = firstConfiguredValue(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL,
);
const publishableKey = firstConfiguredValue(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const isSupabaseConfigured = Boolean(
  url && publishableKey && !publishableKey.includes("your-local-anon-key"),
);

// A placeholder keeps the visual frontend usable before a local Supabase stack is started.
// It never has write access; real credentials are injected through .env.local/Vercel.
export const supabase = createClient(
  url ?? "http://127.0.0.1:54321",
  publishableKey ?? "sb_publishable_local_placeholder",
);
