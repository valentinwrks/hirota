import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: t("login.metaTitle") };
}

// Standalone admin login: no store chrome, no admin sidebar. The proxy lets
// unauthenticated users reach this page and bounces already-authenticated users
// straight to the shell.
export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("Admin");

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border border-border">
        <div className="h-[26px] flex items-center px-2 border-b border-border text-sm leading-none text-foreground">
          {t("title")}
        </div>
        <div className="p-4">
          <h1 className="text-foreground text-[18px] font-bold mb-4 leading-none">{t("login.title")}</h1>
          <AdminLoginForm locale={locale} />
        </div>
      </div>
    </div>
  );
}
