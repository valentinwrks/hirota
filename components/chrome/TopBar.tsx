import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { CurrencySwitcher } from "@/components/ui/CurrencySwitcher";

// Fixed 26px top bar: HIROTA logo (left) and the language / currency switches
// (right — the slot the old theme dots used to occupy). No theme switcher.
export async function TopBar() {
  const t = await getTranslations("TopBar");

  return (
    <header className="fixed top-0 left-0 w-full h-[26px] border-y border-neutral-400 bg-white z-50 flex items-center justify-between px-2 pb-[1px] select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hirota/logo-空手衣のヒロタ.svg"
        alt={t("logoAlt")}
        className="h-[22px] object-contain object-center"
      />
      <div className="flex items-center gap-3 text-xs leading-none">
        <LocaleSwitcher label={t("language")} />
        <span className="text-neutral-400">|</span>
        <CurrencySwitcher label={t("currency")} />
      </div>
    </header>
  );
}
