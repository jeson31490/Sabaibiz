import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SabaiBiz",
    short_name: "SabaiBiz",
    description: "Photograph supplier invoices and see today's money in and out.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#031b1c",
    theme_color: "#031b1c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
