import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware wrappers around Next's navigation primitives. Always import
// `Link`, `useRouter`, `redirect`, etc. from here (not from `next/navigation`)
// so the active locale prefix is preserved automatically.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
