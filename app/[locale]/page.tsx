import { redirect } from "next/navigation";

// The store index has no standalone view yet — send visitors to the first
// functional category. Locale prefix is preserved by using the awaited param.
export default async function LocaleIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/catalog/equipment`);
}
