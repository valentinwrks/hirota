import "server-only";

import { createAuthClient } from "@/lib/supabase/auth-server";
import type { Database } from "@/lib/database.types";

// Read for the admin news editor. Goes through the admin's auth client so the
// whole admin data path is uniform (news is publicly readable anyway; RLS
// matters on the write side — see actions.ts).
export type NewsRow = Database["public"]["Tables"]["news"]["Row"];

/**
 * All news posts for the editor, newest first. Returns [] on error (including
 * before the table migration is applied) so the editor still renders its create
 * form rather than throwing.
 */
export async function listNews(): Promise<NewsRow[]> {
  const supabase = await createAuthClient();
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .order("published_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}
