"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { signIn, type LoginState } from "@/app/[locale]/admin/login/actions";

const initialState: LoginState = { error: null };

// Client login form. Uses React 19 useActionState to call the signIn server
// action and surface a clean error. No signup / password-reset links (single
// admin, out of scope). The two fields reuse the obi configurator's embroidery
// input cells verbatim: a border-collapsed OptionTable of EmbroideryInputRows.
export function AdminLoginForm({ locale }: { locale: string }) {
  const t = useTranslations("Admin");
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col text-xs">
      <input type="hidden" name="locale" value={locale} />

      <table className="w-full border-collapse text-xs font-bold">
        <tbody>
          <FieldRow
            label={t("login.email")}
            name="email"
            type="email"
            autoComplete="username"
            pending={pending}
          />
          <FieldRow
            label={t("login.password")}
            name="password"
            type="password"
            autoComplete="current-password"
            pending={pending}
          />
        </tbody>
      </table>

      {state.error ? (
        <p className="mt-2 text-[11px] text-red-700 leading-tight">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={
          "mt-5 text-xs font-bold border tracking-wide py-1 uppercase " +
          (pending
            ? "bg-transparent text-foreground-blocked border-border-blocked"
            : "bg-transparent text-foreground border-border hover:bg-foreground-hover active:bg-foreground-selected active:text-background cursor-pointer")
        }
      >
        {pending ? t("login.signingIn") : t("login.signIn")}
      </button>
    </form>
  );
}

// Mirrors the obi configurator's EmbroideryInputRow: a bordered table cell whose
// fill tracks state (hover/focus tint, "selected" fill once a value is left in
// it), an inline left label and a right-aligned transparent input. The parent
// table's border-collapse merges the two cells' shared border into one line.
function FieldRow({
  label,
  name,
  type,
  autoComplete,
  pending,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
  pending: boolean;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const completed = !focused && value.trim().length > 0;
  const cellState = pending
    ? "text-foreground-pending cursor-default"
    : completed
      ? "bg-foreground-selected text-background"
      : "hover:bg-foreground-hover focus-within:bg-foreground-hover";
  const borderClass = pending ? "border-border-pending" : "border-border";

  return (
    <tr>
      <td className={"px-2 py-1 border " + borderClass + " " + cellState}>
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          <input
            type={type}
            name={name}
            autoComplete={autoComplete}
            required
            disabled={pending}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-label={label}
            className="flex-1 text-right bg-transparent focus:outline-none disabled:cursor-default"
          />
        </div>
      </td>
    </tr>
  );
}
