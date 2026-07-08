import { redirect } from "next/navigation";

// Admin index → Orders (the primary section, and the fax replacement).
export default async function AdminIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/admin/orders`);
}
