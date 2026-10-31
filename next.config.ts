import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // No floating dev badge over the app; compile errors still show.
  devIndicators: false,
  // Videos and Podcasts now live together in YouTube.
  redirects() {
    return [
      { source: "/videos", destination: "/youtube", permanent: true },
      { source: "/podcasts", destination: "/youtube", permanent: true },
    ];
  },
  // Story pictures and the statue rarely change: phones keep them for a week and refresh quietly.
  headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }];
    return [
      { source: "/stories/:path*", headers: cache },
      { source: "/alexander.webp", headers: cache },
      { source: "/icons/:path*", headers: cache },
      // The service worker itself is always fetched fresh, so app updates arrive straight away.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
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
