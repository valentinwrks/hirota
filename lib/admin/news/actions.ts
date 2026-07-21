"use server";

import { revalidatePath } from "next/cache";
import { createAuthClient } from "@/lib/supabase/auth-server";

// Admin news CRUD. Unlike the pricing editors (value-only edits), news is
// content the admin creates and removes over time, so full insert/update/delete
// is exposed. Security is layered: these checks are the polite front door; the
// real guard is RLS (is_admin() policies from the migration). `.select()` after
// each write detects a row the DB refused (not admin / missing) — zero rows =
// error, never a silent no-op.

export type NewsResult = { ok: true } | { ok: false; error: string };

/** Accepts only an ISO calendar date (YYYY-MM-DD), as produced by <input type="date">. */
function cleanDate(v: unknown): string | null {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}
function cleanText(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

// The about column (news feed) renders in the store layout; flush the whole
// route so the change shows on the next request. News edits are rare.
function revalidateStore(): void {
  revalidatePath("/", "layout");
}

export async function createNews(input: {
  publishedOn: string;
  title: string;
  body: string;
}): Promise<NewsResult> {
  const published_on = cleanDate(input.publishedOn);
  const title = cleanText(input.title);
  const body = cleanText(input.body);
  if (!published_on || !title || !body) {
    return { ok: false, error: "Date, title and body are required." };
  }

  const supabase = await createAuthClient();
  const { data, error } = await supabase
    .from("news")
    .insert({ published_on, title, body })
    .select("id");

  if (error) return { ok: false, error: "Could not save." };
  if (!data || data.length === 0) {
    return { ok: false, error: "Not saved — check you are signed in as admin." };
  }
  revalidateStore();
  return { ok: true };
}

export async function updateNews(input: {
  id: number;
  publishedOn: string;
  title: string;
  body: string;
}): Promise<NewsResult> {
  const published_on = cleanDate(input.publishedOn);
  const title = cleanText(input.title);
  const body = cleanText(input.body);
  if (!Number.isInteger(input.id) || !published_on || !title || !body) {
    return { ok: false, error: "Date, title and body are required." };
  }

  const supabase = await createAuthClient();
  const { data, error } = await supabase
    .from("news")
    .update({ published_on, title, body })
    .eq("id", input.id)
    .select("id");

  if (error) return { ok: false, error: "Could not save." };
  if (!data || data.length === 0) {
    return { ok: false, error: "Not saved — post not found." };
  }
  revalidateStore();
  return { ok: true };
}

export async function deleteNews(id: number): Promise<NewsResult> {
  if (!Number.isInteger(id)) return { ok: false, error: "Invalid post." };

  const supabase = await createAuthClient();
  const { data, error } = await supabase
    .from("news")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, error: "Could not delete." };
  if (!data || data.length === 0) {
    return { ok: false, error: "Not deleted — post not found." };
  }
  revalidateStore();
  return { ok: true };
}
