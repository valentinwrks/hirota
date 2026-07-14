"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "@/app/[locale]/admin/login/actions";

const initialState: LoginState = { error: null };

// Client login form. Uses React 19 useActionState to call the signIn server
// action and surface a clean error. No signup / password-reset links (single
// admin, out of scope). Monospaced/tabular styling to match the store chrome.
export function AdminLoginForm({ locale }: { locale: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 text-[13px]">
      <input type="hidden" name="locale" value={locale} />

      <label className="flex flex-col gap-1">
        <span className="text-ink-40 leading-none">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          className="h-8 px-2 border border-border bg-paper text-ink-70 outline-none focus:border-ink-50"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-ink-40 leading-none">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="h-8 px-2 border border-border bg-paper text-ink-70 outline-none focus:border-ink-50"
        />
      </label>

      {state.error ? (
        <p className="text-[12px] text-red-700 leading-tight">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-8 border border-ink-50 text-ink-70 hover:bg-ink-04 disabled:opacity-50 leading-none"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
