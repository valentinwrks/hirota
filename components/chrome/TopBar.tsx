import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { CurrencySwitcher } from "@/components/ui/CurrencySwitcher";

// Fixed 26px top bar: HIROTA logo (left) and the language / currency switches
// (right — the slot the old theme dots used to occupy). No theme switcher.
// `trailing` is an optional slot rendered in the right group AFTER the currency
// switch, at the same gap — the admin shell uses it for the Sign-out control.
// `mobile` is an optional slot that REPLACES the whole right group below md
// (the switches move into the shell's dropdown menu): the store passes its
// cart + menu controls, the admin its menu trigger. Without it the standard
// group shows at every size.
export async function TopBar({
  trailing,
  mobile,
}: {
  trailing?: React.ReactNode;
  mobile?: React.ReactNode;
}) {
  const t = await getTranslations("TopBar");

  return (
    <header className="fixed top-0 left-0 w-full h-[26px] border-y border-border bg-white/70 z-50 flex items-center justify-between pl-1 pr-2 pb-[1px] select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hirota/logo-空手衣のヒロタ.svg"
        alt={t("logoAlt")}
        className="h-[21px] object-contain object-center"
      />
      <div
        className={
          (mobile ? "hidden md:flex" : "flex") +
          " items-center gap-6 text-[13px] leading-none"
        }
      >
        <LocaleSwitcher label={t("language")} />
        <CurrencySwitcher label={t("currency")} />
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
