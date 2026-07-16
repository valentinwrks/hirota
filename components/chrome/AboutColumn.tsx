import { getTranslations } from "next-intl/server";
import { MobileMenuButton } from "./MobileMenuButton";

// Left "about" column: company history, offices, hours, visit policy, footer.
// Narrowest of the three regions. Static chrome (server component). Below md it
// renders inside a MobilePanel overlay (the `/` hirota landing): full
// width/height, no divider border, and the nav hamburger in the header (this is
// how you leave the landing — pick a category from the menu).
export async function AboutColumn() {
  const t = await getTranslations("About");

  return (
    <section className="basis-[22%] 2xl:basis-[20%] shrink-0 border-r border-border overflow-y-auto overscroll-contain scrollbar-none max-md:h-full max-md:border-r-0">
      {/* sticky section header */}
      <div className="sticky top-0 z-10 h-[26px] flex items-center px-1.5 border-b border-border text-sm leading-none backdrop-blur-xs">
        {t("title")}
        <MobileMenuButton />
      </div>

      <div className="mt-2 mx-1.5 text-xs leading-tight">
        <p>
          <span className="font-bold">空手衣のヒロタ Hirota Co., Ltd</span> {t("intro")}
        </p>
        <p className="mt-2">{t("history")}</p>

        {/* store symbol */}
        <div className="mx-1.5 my-3 select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hirota/空手衣のヒロタ.svg"
            alt="空手衣のヒロタ"
            className="w-full opacity-50"
          />
        </div>

        {/* Tokyo head office */}
        <div>
          <p className="font-bold">{t("tokyoTitle")}</p>
          <p>{t("tokyoAddress")}</p>
          <div className="flex justify-between">
            <span>{t("tokyoTel")}</span>
            <span>{t("tokyoFax")}</span>
          </div>
          <span className="underline cursor-pointer text-foreground-muted hover:text-[#5e8fff]">{t("tokyoEmail")}</span>
          <p>{t("hoursTitle")}</p>
          <ul className="list-disc list-outside pl-4">
            <li>{t("hoursWeekday")}</li>
            <li>{t("hoursSaturday")}</li>
            <li>{t("hoursClosed")}</li>
          </ul>
        </div>

        {/* Fukuoka branch */}
        <div className="mt-6">
          <p className="font-bold">{t("fukuokaTitle")}</p>
          <p>{t("fukuokaAddress")}</p>
          <div className="flex justify-between">
            <span>{t("fukuokaTel")}</span>
            <span>{t("fukuokaFax")}</span>
          </div>
          <span className="underline cursor-pointer text-foreground-muted hover:text-[#5e8fff]">{t("fukuokaEmail")}</span>
          <p>{t("hoursTitle")}</p>
          <ul className="list-disc list-outside pl-4">
            <li>{t("hoursWeekday")}</li>
            <li>{t("hoursSaturday")}</li>
            <li>{t("hoursClosed")}</li>
          </ul>
        </div>

        {/* Aichi factory */}
        <div className="mt-6">
          <p className="font-bold">{t("aichiTitle")}</p>
          <p>{t("aichiAddress")}</p>
          <div className="flex justify-between">
            <span>{t("aichiTel")}</span>
            <span>{t("aichiFax")}</span>
          </div>
        </div>

        {/* visit policy */}
        <div className="mt-8">
          <p className="uppercase">{t("visitTitle")}:</p>
          <p>{t("visitP1")}</p>
          <p className="mt-2">{t("visitP2")}</p>
          <p className="mt-2">{t("visitP3")}</p>
        </div>
      </div>
    </section>
  );
}
