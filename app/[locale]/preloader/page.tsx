import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { PreloaderPreview } from "@/components/ui/PreloaderPreview";

// Standalone preloader preview for styling work. Reachable at /preloader (the
// i18n proxy redirects it to /<locale>/preloader). Lives under [locale] so it
// inherits the root <html>/<body> shell; it does NOT use the (store) chrome, so
// the page is just the preloader over the site background.
export default async function PreloaderPreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return <PreloaderPreview />;
}
