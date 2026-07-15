import { signOut } from "@/app/[locale]/admin/login/actions";

// Sign-out control — a plain form posting to the signOut server action, which
// clears the session cookies and redirects to login. No client JS needed.
// Styled to sit inline in the 26px TopBar, matching the language/currency
// switches (muted → strong on hover).
export function SignOutButton({ locale }: { locale: string }) {
  return (
    <form action={signOut} className="flex items-center">
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        className="cursor-pointer uppercase text-foreground-muted hover:text-foreground-strong leading-none"
      >
        Sign out
      </button>
    </form>
  );
}
