import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { TopBar } from "@/components/chrome/TopBar";
import { LogoColumn } from "@/components/chrome/LogoColumn";
import { getUsdPerJpy } from "@/lib/currency/fx";
import { CurrencyProvider } from "@/lib/currency/CurrencyProvider";

// Protected admin shell. The proxy already blocked unauthenticated users
// (optimistic check); THIS layout does the real authorization: it verifies the
// authenticated user is THE admin via public.is_admin() before rendering any
// admin content. Non-admins (shouldn't happen with one user, but enforced) are
// bounced to login. English-only chrome by decision.
export default async function AdminProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createAuthClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/admin/login`);

  // Authorization is separate from authentication: a valid session is not
  // enough — the user must be the registered admin. is_admin() reads auth.uid()
  // server-side and is the same predicate that guards admin RLS in later sprints.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect(`/${locale}/admin/login`);

  // The shared TopBar hosts the CurrencySwitcher, which reads CurrencyProvider —
  // so the admin shell provides it too (same server-fetched, cached FX rate as
  // the store). LocaleSwitcher needs no provider.
  const usdPerJpy = await getUsdPerJpy();

  // Pin to the viewport and scroll the content region internally. globals.css
  // locks page scroll (html overflow hidden) for the store's column chrome, so
  // the admin mirrors that shell: the shared public TopBar (fixed 26px), then a
  // full-height row — sidebar (left) · scrollable main · and on 2xl+ the
  // vertical-logo column on the FAR RIGHT, opposite the sidebar. The sidebar is
  // transparent (no white fill) so the body's sky gradient shows through,
  // matching the storefront columns. main carries the 2xl-only right border that
  // divides it from the logo column (whose own border-r sits at the screen edge).
  return (
    <CurrencyProvider rate={usdPerJpy}>
      {/* Sign-out lives in the shared TopBar's trailing slot (after currency). */}
      <TopBar trailing={<SignOutButton locale={locale} />} />
      <div className="mt-[26px] h-[calc(100vh-26px)] overflow-hidden flex text-[13px]">
        <aside className="w-[220px] shrink-0 border-r border-border flex flex-col">
          <p className="px-3.5 pt-3 pb-2 text-sm font-bold leading-none text-foreground-strong">
            HIROTA / ADMIN
          </p>
          <AdminSidebar locale={locale} />
        </aside>
        <main className="flex-1 min-w-0 overflow-y-auto scrollbar-none 2xl:border-r 2xl:border-border">
          {children}
        </main>
        <LogoColumn />
      </div>
    </CurrencyProvider>
  );
}
