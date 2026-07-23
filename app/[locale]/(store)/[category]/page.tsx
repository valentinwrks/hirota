import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/lib/i18n/routing";
import { isNavCategory } from "@/lib/catalog/types";
import { CategoryView } from "@/components/catalog/CategoryView";

// Pre-render the four category routes per locale.
export function generateStaticParams() {
  return (
    ["karate-gi", "obi", "equipment", "accessories"] as const
  ).map((category) => ({ category }));
}

// Per-category title (e.g. "Obi" → "Obi — HIROTA" via the layout's template).
// The brand suffix is appended by the parent `title.template`, so we set only
// the segment. Unknown categories 404 in the page, so fall back to defaults.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}): Promise<Metadata> {
  const { locale, category } = await params;
  if (!isNavCategory(category)) return {};
  const t = await getTranslations({ locale, namespace: "Meta.category" });
  // Uppercased in the title only (like ADMIN) — the label stays natural-case for
  // the nav/headings. Japanese has no case, so JA labels are unaffected.
  return { title: t(category).toUpperCase() };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  if (!isNavCategory(category)) notFound();
  setRequestLocale(locale);

  return <CategoryView category={category} locale={locale as Locale} />;
}
