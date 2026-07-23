import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

// Thin wrapper over BOTH admin sub-trees (login + the protected shell) whose only
// job is to give every admin route one uniform browser title. The real chrome and
// auth live in admin/(protected)/layout.tsx and admin/login/page.tsx.
//
// Every admin route (login + protected) shows one title: "ADMIN — HIROTA 空手衣の
// ヒロタ" (JA: "管理 — …"). We set only the bare segment ("ADMIN"/"管理") as the
// default for admin children; the root layout's `title.template` appends the
// brand suffix, so the brand string stays defined in exactly one place. The
// `%s` passthrough template applies only if a future admin page sets its own
// title — it adds nothing itself, leaving the brand suffix to the root template.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: { default: t("metaTitle"), template: "%s" } };
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
