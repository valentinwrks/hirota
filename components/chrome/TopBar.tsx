import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { CurrencySwitcher } from "@/components/ui/CurrencySwitcher";

// Fixed 26px top bar: HIROTA logo (left) and the language / currency switches
// (right — the slot the old theme dots used to occupy). No theme switcher.
export async function TopBar() {
  const t = await getTranslations("TopBar");

  return (
    <header className="fixed top-0 left-0 w-full h-[26px] border-y border-border bg-background z-50 flex items-center justify-between pl-1 pr-2 pb-[1px] select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hirota/logo-空手衣のヒロタ.svg"
        alt={t("logoAlt")}
        className="h-[21px] object-contain object-center"
      />
      <div className="flex items-center gap-6 text-[13px] leading-none">
        <LocaleSwitcher label={t("language")} />
        <CurrencySwitcher label={t("currency")} />
      </div>
    </header>
  );
}
