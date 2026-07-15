import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: "HIROTA Admin — Sign in",
};

// Standalone admin login: no store chrome, no admin sidebar. English-only
// (admin content is not localized). The proxy lets unauthenticated users reach
// this page and bounces already-authenticated users straight to the shell.
export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[320px] border border-border bg-background">
        <div className="h-[26px] flex items-center px-2 border-b border-border text-sm leading-none text-foreground">
          HIROTA / ADMIN
        </div>
        <div className="p-4">
          <h1 className="text-foreground-strong text-[15px] mb-4 leading-none">Sign in</h1>
          <AdminLoginForm locale={locale} />
        </div>
      </div>
    </div>
  );
}
