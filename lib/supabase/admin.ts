import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

// Privileged, server-ONLY Supabase client using the SECRET key
// (`sb_secret_…`), which BYPASSES Row Level Security. It is the counterpart the
// read-only public client (server.ts) anticipated: the one path allowed to touch
// orders/order_items and to write product stock.
//
// HARD RULES (AGENTS §5):
//   - Never import this into client code. `import "server-only"` makes a client
//     bundle that reaches it fail the build.
//   - The secret key is never shipped to the browser and never committed.
//
// Used by the checkout server action to insert orders and call `create_order`.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (server-only).",
    );
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
