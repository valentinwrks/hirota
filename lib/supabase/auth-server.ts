import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../database.types";

// SSR auth client — the THIRD Supabase client (alongside the public read client
// in server.ts and the secret-key client in admin.ts).
//
// It uses the *publishable* key (never the secret key — logging in must not by
// itself grant privilege), but unlike the public read client it carries a
// SESSION stored in cookies. This is what proves "a user is logged in" to server
// components and server actions. Admin *authorization* is a separate check
// (public.is_admin()), never conflated with merely having a session.
//
// Cookie model: @supabase/ssr keeps the access token (short-lived JWT) and the
// refresh token in cookies. Reads happen in Server Components (cookies are
// read-only there); writes (login, token refresh, logout) happen in Server
// Actions / proxy where cookies are mutable. The setAll try/catch below absorbs
// the read-only case — proxy is responsible for actually refreshing tokens.
export async function createAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies() is read-only.
          // Safe to ignore: proxy.ts refreshes the session on every request.
        }
      },
    },
  });
}
