import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Shared OG/Twitter social image for every store page in this locale segment.
// Generated at build time (no request-time APIs). `twitter-image.tsx`
// re-exports this module so both cards use one image.
//
// Design: the site's diagonal sky→white→sky gradient (globals.css `body`) with
// the HIROTA wordmark (public/hirota/logo-blue.svg) centered. The site's version
// is animated; a static image can't move, so we bake a single representative
// frame — sky corners, white through the center — which also gives the logo the
// most contrast. The logo is a self-contained SVG embedded as a data URI so
// next/og (Satori) can rasterize it; no CJK text is drawn, so the missing-glyph
// problem that affects rendered Japanese text does not apply here.
export const alt =
  "HIROTA — 空手衣・空手用品専門店 / Karate Gi & Karate Equipment Specialty Store";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// --sky and --background tokens from globals.css; same 135deg stops as the body.
const BG_GRADIENT = "linear-gradient(135deg, #b3e5fc 0%, #ffffff 50%, #b3e5fc 100%)";

// HIROTA wordmark — native aspect ratio 404.16 × 53.12 (≈7.6:1).
const LOGO_WIDTH = 840;
const LOGO_HEIGHT = Math.round((LOGO_WIDTH * 53.12) / 404.16);

// Japanese lockup (logo-no-hirota.svg) — native aspect ratio 126 × 32 (≈3.9:1).
// Sits below the wordmark as a subtitle. Used as-is (it ships with its own
// opacity), so no recolor is applied.
const JP_WIDTH = 410;
const JP_HEIGHT = Math.round((JP_WIDTH * 32) / 126);

// Vertical gap between the wordmark's bottom edge and the lockup's top edge.
// Negative because both SVGs carry generous internal padding in their viewBoxes,
// so the img boxes are taller than the visible ink — the boxes must overlap to
// bring the glyphs optically close.
const GAP = -10;

// Embed a self-contained SVG file as a base64 data URI for next/og (Satori).
async function svgDataUri(relPath: string): Promise<string> {
  const svg = await readFile(join(process.cwd(), relPath));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

export default async function Image() {
  const [logoSrc, jpSrc] = await Promise.all([
    svgDataUri("public/hirota/logo-blue.svg"),
    svgDataUri("public/hirota/logo-no-hirota.svg"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: BG_GRADIENT,
        }}
      >
        {/* Wordmark: vertically centered in the canvas. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          alt=""
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
        {/* Lockup: sits just below the centered wordmark. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={jpSrc}
          width={JP_WIDTH}
          height={JP_HEIGHT}
          alt=""
          style={{
            position: "absolute",
            left: "50%",
            top: `${size.height / 2 + LOGO_HEIGHT / 2 + GAP}px`,
            transform: "translateX(-50%)",
            opacity: 0.9,
          }}
        />
      </div>
    ),
    size,
  );
}
