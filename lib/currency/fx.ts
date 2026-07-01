import "server-only";

// USD/JPY exchange rate, fetched server-side and cached.
//
// JPY is the source of truth; USD is a display-only conversion. We express the
// rate as USD per 1 JPY (so `amountJpy * rate = amountUsd`).
//
// Next 16 caching is opt-in, so we cache explicitly via `fetch`'s `next.revalidate`
// (1 hour). If the FX source is unreachable or returns junk, we fall back to a
// documented constant — the only hardcoded rate allowed by AGENTS §10. There is
// no client-side refresh interval this sprint.

// Fallback: ~1 JPY = 0.0064 USD (≈ 156 JPY/USD), a mid-2025 ballpark. Documented
// and deliberate; update if it drifts materially.
export const USD_PER_JPY_FALLBACK = 0.0064;

const FX_ENDPOINT = "https://open.er-api.com/v6/latest/JPY";
const REVALIDATE_SECONDS = 60 * 60; // 1 hour

/** Return USD per 1 JPY, cached for an hour, falling back to a constant. */
export async function getUsdPerJpy(): Promise<number> {
  try {
    const res = await fetch(FX_ENDPOINT, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return USD_PER_JPY_FALLBACK;

    const data: unknown = await res.json();
    const rate = extractUsdRate(data);
    return rate ?? USD_PER_JPY_FALLBACK;
  } catch {
    return USD_PER_JPY_FALLBACK;
  }
}

/** Pull rates.USD out of the open.er-api.com response shape, if valid. */
function extractUsdRate(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const rates = (data as { rates?: unknown }).rates;
  if (!rates || typeof rates !== "object") return null;
  const usd = (rates as { USD?: unknown }).USD;
  return typeof usd === "number" && usd > 0 ? usd : null;
}
