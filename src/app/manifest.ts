import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Alexender",
    short_name: "Alexender",
    description: "Your personal command center — plan the day, conquer the mission.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0c0b",
    theme_color: "#0d0c0b",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
