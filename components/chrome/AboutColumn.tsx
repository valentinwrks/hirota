import { getTranslations } from "next-intl/server";
import { MobileLogoFooter } from "./MobileLogoFooter";

// Left "about" column: company history, offices, hours, visit policy, footer.
// Narrowest of the three regions. Static chrome (server component). Below md it
// renders inside a MobilePanel overlay (the `/` hirota landing): full
// width/height, no divider border. You leave the landing via the TopBar menu
// (pick a category) or the logo (→ `/`).
export async function AboutColumn() {
  const t = await getTranslations("About");

  return (
    <section className="basis-[22%] 2xl:basis-[20%] shrink-0 border-r border-border flex flex-col overflow-hidden max-md:h-full max-md:border-r-0">
      {/* section header — desktop only; on mobile the TopBar carries all the
          chrome, so this "hirota" row is dropped from the `/` overlay. Fixed
          above the scroll region (like the cart column / admin) rather than
          sticky-over-content, so nothing passes behind it — no glassmorphism,
          opaque like /admin. */}
      <div className="max-md:hidden shrink-0 h-[26px] flex items-center px-1.5 border-b border-border text-sm leading-none">
        {t("title")}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-none">
      <div className="mt-2 mx-1.5 pb-8 text-xs leading-tight">
        <p>
          <span className="font-bold">Hirota Co., Ltd (空手衣のヒロタ)</span> {t("intro")}
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
          <p className="uppercase font-bold">{t("visitTitle")}</p>
          <p>{t("visitP1")}</p>
          <p className="mt-2">{t("visitP2")}</p>
          <p className="mt-2">{t("visitP3")}</p>
        </div>
      </div>

      <MobileLogoFooter />
      </div>
    </section>
  );
}
