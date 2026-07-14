import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SignOutButton } from "@/components/admin/SignOutButton";

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

  // Pin to the viewport and scroll the content region internally. globals.css
  // locks page scroll (html overflow hidden) for the store's column chrome, so
  // the admin mirrors that: fixed-height shell, scrollable main.
  return (
    <div className="h-screen overflow-hidden flex text-[13px]">
      <aside className="w-[220px] shrink-0 border-r border-border bg-paper flex flex-col">
        <div className="h-[26px] flex items-center px-2 border-b border-border text-sm leading-none text-ink-50">
          HIROTA / ADMIN
        </div>
        <AdminSidebar locale={locale} />
        <div className="mt-auto border-t border-border p-2">
          <SignOutButton locale={locale} />
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto scrollbar-none">
        {children}
      </main>
    </div>
  );
}
