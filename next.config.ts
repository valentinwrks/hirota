import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
};

// Point the plugin at our request config so `getRequestConfig` is picked up.
const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

export default withNextIntl(nextConfig);
