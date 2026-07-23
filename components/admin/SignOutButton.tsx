import { getTranslations } from "next-intl/server";
import { signOut } from "@/app/[locale]/admin/login/actions";

// Sign-out control — a plain form posting to the signOut server action, which
// clears the session cookies and redirects to login. No client JS needed.
// Two looks:
// - "button" (default): the desktop sidebar control, styled identically to the
//   /login sign-in button (full-width, bordered, uppercase, hover/active states).
// - "link": a plain-text control for the mobile menu flap — no box, no uppercase,
//   inheriting the surrounding text size so it sits flush with the section links.
// `className` tunes the "button" variant per placement (the mobile flap wants the
// site base size and a content-width box rather than the desktop's tiny, full-
// width control); when omitted it falls back to the desktop look (text-xs).
export async function SignOutButton({
  locale,
  variant = "button",
  className,
}: {
  locale: string;
  variant?: "button" | "link";
  className?: string;
}) {
  const t = await getTranslations("Admin");
  const cls =
    variant === "link"
      ? "normal-case text-left hover:opacity-60 cursor-pointer"
      : "font-bold border tracking-wide py-1 uppercase bg-transparent text-foreground border-border hover:bg-foreground-hover active:bg-foreground-selected active:text-background cursor-pointer " +
        (className ?? "text-xs");
  return (
    <form action={signOut} className="flex flex-col">
      <input type="hidden" name="locale" value={locale} />
      <button type="submit" className={cls}>
        {t("signOut")}
      </button>
    </form>
  );
}
