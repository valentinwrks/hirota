import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./lib/i18n/routing";

// Next 16 renames `middleware.ts` → `proxy.ts` (runs on the Node.js runtime).
// This proxy composes TWO concerns that must coexist without breaking each
// other: next-intl locale routing (for the store) and Supabase admin-session
// handling (for /admin). Per the Next docs, a proxy is for optimistic checks +
// token refresh — NOT full authorization. So here we only (a) keep the session
// fresh and (b) do a coarse "is anyone logged in?" gate on /admin. The real
// "is this THE admin?" authorization lives server-side in the admin layout.

const handleI18n = createMiddleware(routing);

// Matches /en/admin, /ja/admin, and anything beneath. The login page is carved
// out separately so unauthenticated users can actually reach it.
const ADMIN_RE = /^\/(en|ja)\/admin(?:\/|$)/;
const LOGIN_RE = /^\/(en|ja)\/admin\/login\/?$/;

export async function proxy(request: NextRequest) {
  // 1. Locale routing first. This response already carries any locale redirect/
  //    rewrite and the NEXT_LOCALE cookie; we thread Supabase's refreshed
  //    session cookies onto the SAME response so nothing is lost.
  const response = handleI18n(request);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Write refreshed tokens onto both the request (so a downstream read in
        // this same pass sees them) and the outgoing response (so the browser
        // stores them).
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // 2. getUser() revalidates the token against the auth server (and triggers a
  //    refresh if needed) — unlike getSession(), it can be trusted server-side.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 3. Coarse gate: an unauthenticated hit on /admin/** (except the login page)
  //    redirects to the localized login. We COPY the freshly-set auth cookies
  //    onto the redirect — skipping this loses the refresh and can cause a
  //    redirect loop.
  const { pathname } = request.nextUrl;
  const isAdmin = ADMIN_RE.test(pathname);
  const isLogin = LOGIN_RE.test(pathname);
  const locale = pathname.split("/")[1] || routing.defaultLocale;

  if (isAdmin && !isLogin && !user) {
    const redirect = NextResponse.redirect(
      new URL(`/${locale}/admin/login`, request.url),
    );
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  // Already-authenticated user landing on the login page → send them inward.
  if (isLogin && user) {
    const redirect = NextResponse.redirect(
      new URL(`/${locale}/admin`, request.url),
    );
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  return response;
}

export const config = {
  // Match everything except Next internals, API routes, and static assets
  // (files with an extension, e.g. images in /public and /products).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
