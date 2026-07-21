import { getTranslations } from "next-intl/server";
import { signOut } from "@/app/[locale]/admin/login/actions";

// Sign-out control — a plain form posting to the signOut server action, which
// clears the session cookies and redirects to login. No client JS needed.
// Two looks:
// - "button" (default): the desktop sidebar control, styled identically to the
//   /login sign-in button (full-width, bordered, uppercase, hover/active states).
// - "link": a plain-text control for the mobile menu flap — no box, no uppercase,
//   inheriting the surrounding text size so it sits flush with the section links.
export async function SignOutButton({
  locale,
  variant = "button",
}: {
  locale: string;
  variant?: "button" | "link";
}) {
  const t = await getTranslations("Admin");
  const className =
    variant === "link"
      ? "normal-case text-left hover:opacity-60 cursor-pointer"
      : "text-xs font-bold border tracking-wide py-1 uppercase bg-transparent text-foreground border-border hover:bg-foreground-hover active:bg-foreground-selected active:text-background cursor-pointer";
  return (
    <form action={signOut} className="flex flex-col">
      <input type="hidden" name="locale" value={locale} />
      <button type="submit" className={className}>
        {t("signOut")}
      </button>
    </form>
  );
}
