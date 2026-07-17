"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { createAuthClient } from "@/lib/supabase/auth-server";

export type LoginState = { error: string | null };

function safeLocale(value: FormDataEntryValue | null): string {
  return typeof value === "string" && routing.locales.includes(value as never)
    ? value
    : routing.defaultLocale;
}

// Authenticates the SINGLE existing admin user (created manually in Studio).
// There is no signup/reset — this only signs an existing user in. On success the
// SSR client writes the session cookies (via createAuthClient's setAll) and we
// redirect into the shell; the (protected) layout then verifies admin identity.
export async function signIn(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const locale = safeLocale(formData.get("locale"));
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const t = await getTranslations({ locale, namespace: "Admin" });

  if (!email || !password) {
    return { error: t("login.missing") };
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Generic message — don't reveal whether the email exists.
    return { error: t("login.invalid") };
  }

  // redirect() throws internally; it must be OUTSIDE the try/return path above.
  redirect(`/${locale}/admin`);
}

// Clears the session cookies and returns to the login screen.
export async function signOut(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get("locale"));
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/admin/login`);
}
