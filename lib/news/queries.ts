import { createPublicClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

// Public read for the storefront about-column news feed. Runs in Server
// Components against the publishable-key client; RLS enforces read-only access.
export type NewsRow = Database["public"]["Tables"]["news"]["Row"];

/**
 * All news posts, newest first. News is non-critical chrome, so a failed load
 * (including before the table migration is applied) returns an empty list
 * rather than throwing — the about column must never break on it.
 */
export async function getNews(): Promise<NewsRow[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .order("published_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}
