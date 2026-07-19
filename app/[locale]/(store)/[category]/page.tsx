import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
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
