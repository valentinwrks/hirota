import { getTranslations } from "next-intl/server";
import { signOut } from "@/app/[locale]/admin/login/actions";

// Sign-out control — a plain form posting to the signOut server action, which
// clears the session cookies and redirects to login. No client JS needed.
// Sits at the bottom of the admin sidebar; styled identically to the /login
// sign-in button (full-width, bordered, uppercase, same hover/active states).
export async function SignOutButton({ locale }: { locale: string }) {
  const t = await getTranslations("Admin");
  return (
    <form action={signOut} className="flex flex-col">
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        className="text-xs font-bold border tracking-wide py-1 uppercase bg-transparent text-foreground border-border hover:bg-foreground-hover active:bg-foreground-selected active:text-background cursor-pointer"
      >
        {t("signOut")}
      </button>
    </form>
  );
}
