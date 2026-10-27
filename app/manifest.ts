import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SabaiBiz",
    short_name: "SabaiBiz",
    description: "Photograph supplier invoices and see today's money in and out.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fbfaf6",
    theme_color: "#0a646d",
    icons: [{ src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
