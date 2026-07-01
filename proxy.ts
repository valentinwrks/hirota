import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";

// Next 16 renames `middleware.ts` → `proxy.ts` (runs on the Node.js runtime).
// For now this ONLY handles next-intl locale routing: it redirects `/` → `/en`
// and rewrites locale-prefixed paths.
//
// TODO (later sprint): admin route protection will be layered in here — gate
// `/[locale]/admin/**` behind the Supabase admin session before the request is
// rendered. Keep that logic composed with the intl middleware below.
export const proxy = createMiddleware(routing);

export const config = {
  // Match everything except Next internals, API routes, and static assets
  // (files with an extension, e.g. images in /public and /products).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
