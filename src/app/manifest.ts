import type { MetadataRoute } from "next";

/** What phones and PWABuilder read to install Alexander as an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Ἀλέξανδρος — Alexander",
    short_name: "Alexander",
    description: "Your private command center — plan the day, keep your habits, race your friends.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["productivity", "lifestyle", "health"],
    lang: "en",
    dir: "ltr",
    prefer_related_applications: false,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Today", url: "/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Habits", url: "/habits", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Arena", url: "/arena", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
