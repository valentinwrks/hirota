---
name: verify
description: How to build, launch, and drive this app to verify changes at runtime.
---

# Verifying HIROTA store changes

## Launch

A Next 16 dev daemon is usually already running — check `http://localhost:3000`
first (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/en` → 200
means it's up; `/en` is the hirota landing and renders the equipment default in
the shop column). It serves on **port
3000 regardless of `-p`**, and its log carries stale errors — trust fresh HTTP
responses, not the log. If nothing is up: `pnpm dev`.

## Drive (browser)

No Playwright browsers are cached locally. Use **playwright-core + system
Chrome** instead (no ~120MB download):

```bash
cd <scratchpad> && npm i playwright-core
```

```js
const { chromium } = require("playwright-core");
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
```

Mobile is `< md` (768px): 390×844. Desktop check: 1440×900.

## Flows worth driving

- Catalog → PDP → ADD TO CART → cart → CHECKOUT sheet (simulated payment).
- Configurators: `/en/karate-gi-custom`, `/karate-gi-standard`, `/obi`.
- Mobile chrome: `cart` button in the TopBar; `menu` trigger in the "shop"
  section bar (dropdown hangs at top-[52px]: categories/switchers).
  The hirota (about) overlay IS the store index route `/`: on mobile that root
  path is the full-screen about landing (logo links to `/`; its ✕ leaves for
  `/equipment`); cart overlay is ephemeral UI state.
- Locales: same routes under `/ja`.

## Gotchas

- The PDP "ADD TO CART" button's accessible name is the **product name**
  (aria-label), not "add to cart" — select by text:
  `page.locator('button:has-text("ADD TO CART")')`.
- Store nav links exist twice on mobile (dropdown in `header` + CategoryNav in
  `main`) — scope with `page.getByRole("banner")`.
- Client-side navigations to configurator pages hit the DB and are slow in dev;
  prefer direct `page.goto(...)` + `waitForTimeout(800)` before screenshots.
- The shop column scrolls internally (html overflow is hidden):
  `page.locator("main > section").last().evaluate(el => el.scrollTo(0, el.scrollHeight))`.
- Protected `/admin` needs real Supabase credentials — not in `.env.local`;
  only the login page is verifiable without a session.
