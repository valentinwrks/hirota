import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPanelTitle } from "@/components/admin/AdminPanelTitle";
import { AdminSectionHeading } from "@/components/admin/AdminSectionHeading";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { TopBar } from "@/components/chrome/TopBar";

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

  const t = await getTranslations("Admin");

  // Pin to the viewport and scroll the content region internally. globals.css
  // locks page scroll (html overflow hidden) for the store's column chrome, so
  // the admin mirrors that shell: the shared public TopBar (fixed 26px), then a
  // full-height row — sidebar (left) · scrollable main (no logo column; that's
  // storefront-only chrome). The sidebar is transparent (no white fill) so the
  // body's sky gradient shows through, matching the storefront columns.
  //
  // No CurrencyProvider here: the admin is JPY-only internally, so the TopBar
  // hides the JPY/USD switch (showCurrency={false}) and every amount renders as
  // the stored JPY integer.
  return (
    <>
      {/* Below md the sidebar is hidden and navigation moves into the TopBar's
          dropdown menu (AdminMobileNav) — sections, switches, and sign-out. */}
      <TopBar
        showCurrency={false}
        mobile={
          <AdminMobileNav
            locale={locale}
            signOut={<SignOutButton locale={locale} />}
          />
        }
      />
      <div className="mt-[26px] h-[calc(100dvh-26px)] overflow-hidden flex text-[13px]">
        {/* Each column opens with the same 26px title row the public site puts
            under the TopBar (regular weight, text-sm) — "HIROTA / ADMIN" on the
            sidebar, the open section's name on the content column. */}
        <aside className="hidden md:flex w-[220px] shrink-0 border-r border-border flex-col">
          <div className="shrink-0 h-[26px] flex items-center px-1.5 border-b border-border text-sm leading-none">
            {t("title")}
          </div>
          <AdminSidebar locale={locale} />
          <div className="mt-auto p-1.5">
            <SignOutButton locale={locale} />
          </div>
        </aside>
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="shrink-0 h-[26px] flex items-center px-1.5 border-b border-border text-sm leading-none">
            <AdminPanelTitle />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
            <AdminSectionHeading />
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
