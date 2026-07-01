import type { Locale } from "./routing";

// Localized content is stored in Postgres as JSONB `{ "en": "...", "ja": "..." }`.
// Only EN is guaranteed for now (JA authored later), so we always fall back to EN.
export type LocalizedText = { en: string; ja?: string };

/** Read a localized string for `locale`, falling back to EN then empty string. */
export function localize(
  value: unknown,
  locale: Locale,
): string {
  if (!value || typeof value !== "object") return "";
  const map = value as Record<string, unknown>;
  const preferred = map[locale];
  if (typeof preferred === "string" && preferred.length > 0) return preferred;
  const en = map.en;
  return typeof en === "string" ? en : "";
}
