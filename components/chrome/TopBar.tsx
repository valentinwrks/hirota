import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { CurrencySwitcher } from "@/components/ui/CurrencySwitcher";
import { LogoLink } from "./LogoLink";

// Fixed 26px top bar: HIROTA logo (left) and the language / currency switches
// (right — the slot the old theme dots used to occupy). No theme switcher.
// `trailing` is an optional slot rendered in the right group AFTER the currency
// switch, at the same gap — the admin shell uses it for the Sign-out control.
// `mobile` is an optional slot that REPLACES the whole right group below md
// (the switches move into the shell's dropdown menu): the store passes its
// cart + menu controls, the admin its menu trigger. Without it the standard
// group shows at every size.
// `showCurrency` toggles the JPY/USD switch. The admin is JPY-only internally
// (HIROTA's source of truth), so its shell hides it — a live USD conversion
// there only muddles the rate the buyer actually saw on each order.
export async function TopBar({
  trailing,
  mobile,
  showCurrency = true,
}: {
  trailing?: React.ReactNode;
  mobile?: React.ReactNode;
  showCurrency?: boolean;
}) {
  const t = await getTranslations("TopBar");

  return (
    <header className="fixed top-0 left-0 w-full h-[26px] border-y border-border max-md:border-y-0 bg-white z-50 flex items-center justify-between pl-1 pr-2 pb-[1px] select-none">
      {/* Logo — links to the hirota section in the store (see LogoLink). */}
      <LogoLink alt={t("logoAlt")} />
      <div
        className={
          (mobile ? "hidden md:flex" : "flex") +
          " items-center gap-6 text-[13px] leading-none"
        }
      >
        <LocaleSwitcher label={t("language")} />
        {showCurrency && <CurrencySwitcher label={t("currency")} />}
        {trailing}
      </div>
      {mobile && (
        <div className="flex md:hidden items-center gap-4 text-[13px] leading-none">
          {mobile}
        </div>
      )}
    </header>
  );
}
