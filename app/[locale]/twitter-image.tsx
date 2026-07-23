// Twitter card image = the same generated OG image. Re-exporting avoids
// duplicating the layout; Next treats this file as the `twitter-image` route
// and emits <meta name="twitter:image"> from it.
export { default, alt, size, contentType } from "./opengraph-image";
