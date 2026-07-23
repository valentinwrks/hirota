import { getLocale, getTranslations } from "next-intl/server";
import { getNews } from "@/lib/news/queries";
import { MobileLogoFooter } from "./MobileLogoFooter";
import { ColumnReveal } from "./ColumnReveal";

// "2026-07-14" → "2026.7.14" (year.month.day, no zero padding) — matching the
// dotted date style HIROTA uses on its landing-page announcements.
function formatNewsDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}.${Number(m)}.${Number(d)}`;
}

// Left "about" column: company history, offices, hours, visit policy, footer.
// Narrowest of the three regions. Static chrome (server component). Below md it
// renders inside a MobilePanel overlay (the `/` hirota landing): full
// width/height, no divider border. You leave the landing via the TopBar menu
// (pick a category) or the logo (→ `/`).
export async function AboutColumn() {
  const t = await getTranslations("About");
  const locale = await getLocale();
  const news = await getNews();

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
      <ColumnReveal revealKey={locale}>
      <MobileLogoFooter />
      <div className="mt-[5px] mx-1.5 max-md:mx-2 pb-8 text-xs leading-tight">
        <p>
          <span className="font-bold">{t("brand")}</span> {t("intro")}
        </p>
        <p className="mt-2">{t("history")}</p>

        {/* store symbol */}
        <div className="mb-2 flex justify-center select-none">
          {/* Same width system as the wordmark (SVG 1) but a touch narrower: 93vw,
              centred, clamped by max-w-full to the column width on the narrow
              desktop about column. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hirota/空手衣のヒロタ.svg"
            alt="空手衣のヒロタ"
            className="w-[93vw] max-w-full opacity-50 max-md:opacity-45"
          />
        </div>

        {/* Tokyo head office */}
        <div>
          <p className="font-bold uppercase">{t("tokyoTitle")}</p>
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
        <div className="mt-4">
          <p className="font-bold uppercase">{t("fukuokaTitle")}</p>
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
        <div className="mt-4">
          <p className="font-bold uppercase">{t("aichiTitle")}</p>
          <p>{t("aichiAddress")}</p>
          <div className="flex justify-between">
            <span>{t("aichiTel")}</span>
            <span>{t("aichiFax")}</span>
          </div>
        </div>

        {/* visit policy */}
        <div className="mt-4">
          <p className="uppercase">{t("visitTitle")}</p>
          <p>{t("visitP1")}</p>
          <p className="mt-2">{t("visitP2")}</p>
          <p className="mt-2">{t("visitP3")}</p>
        </div>

        {/* news / お知らせ — replicates HIROTA's landing-page announcements feed.
            Single-language posts (§ migration), newest first. Hidden entirely
            when empty (and before the news table migration is applied). */}
        {news.length > 0 && (
          <div className="mt-6">
            <p className="uppercase font-bold">{t("newsTitle")}</p>
            <div className="mt-2 flex flex-col gap-4">
              {news.map((post) => (
                <div key={post.id}>
                  {/* title (left) + date (right) on one baseline-aligned row;
                      long titles wrap while the date stays pinned right. */}
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-bold min-w-0">{post.title}</p>
                    <p className="shrink-0 font-bold tabular-nums">
                      {formatNewsDate(post.published_on)}
                    </p>
                  </div>
                  <p className="mt-0.5 whitespace-pre-line">{post.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* footer — copyright. Hidden for now, kept for possible future use.
            Year resolved server-side so it stays current when re-enabled:
        <p className="mt-6 text-center text-foreground">
          {new Date().getFullYear()} © HIROTA CO. LTD. All rights reserved
        </p>
        */}
      </div>
      </ColumnReveal>
      </div>
    </section>
  );
}
