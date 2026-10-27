import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // No floating dev badge over the app; compile errors still show.
  devIndicators: false,
  // Story pictures and the statue rarely change: phones keep them for a week and refresh quietly.
  headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }];
    return [
      { source: "/stories/:path*", headers: cache },
      { source: "/alexander.webp", headers: cache },
    ];
  },
  // Open the dev server from your phone on the same Wi-Fi (e.g. http://10.165.6.170:3000).
  // Private network addresses only; the IP can change, so whole ranges are allowed.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*", "127.0.0.1"],
  experimental: {
    // Pages render from data stored in the browser, so there is nothing to pre-render for an
    // instant navigation. Only validate segments that opt in explicitly (none do).
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
