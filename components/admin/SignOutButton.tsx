import { signOut } from "@/app/[locale]/admin/login/actions";

// Sign-out control — a plain form posting to the signOut server action, which
// clears the session cookies and redirects to login. No client JS needed.
export function SignOutButton({ locale }: { locale: string }) {
  return (
    <form action={signOut}>
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        className="w-full h-8 border border-border text-foreground hover:bg-foreground-hover leading-none"
      >
        Sign out
      </button>
    </form>
  );
}
