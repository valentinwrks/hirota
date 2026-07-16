import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/lib/i18n/routing";
import { CategorySubHeader } from "@/components/catalog/CategorySubHeader";

// Store index (`/en`). This is the hirota landing: on mobile the about column
// auto-opens as a full-screen overlay (driven by pathname === "/" in
// MobileChromeProvider). On desktop the about column is the always-visible left
// region and the shop column shows its category nav; below the links we render
// the bare "products" divider bar (no category yet), and the content area stays
// empty until a category is picked.
export default async function StoreIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return <CategorySubHeader />;
}
