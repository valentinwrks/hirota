import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

// Public, server-side Supabase client for READ-ONLY catalog/reference queries.
//
// It uses the *publishable* key (`sb_publishable_…`), which is safe to expose —
// all protection comes from Row Level Security. `products` has a public SELECT
// policy, so anonymous reads work. This client must NEVER be used for privileged
// writes (orders/stock); those go through a separate secret-key client later.
//
// We create a fresh client per call rather than a module singleton: it's a thin
// stateless wrapper (no sessions here) and this keeps it safe across requests.
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
