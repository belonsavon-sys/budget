import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "budget",
    short_name: "budget",
    description: "Your personal budget — with a copilot inside it",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f3ee",
    theme_color: "#f6f3ee",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
