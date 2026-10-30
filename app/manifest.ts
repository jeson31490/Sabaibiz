import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "SabaiBiz",
    short_name: "SabaiBiz",
    description: "Easy accounting for small business. Photograph your invoices, see today's money in and out.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#031b1c",
    theme_color: "#031b1c",
    lang: "en",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Scan an invoice", short_name: "Scan", url: "/dashboard/invoices/scan", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Today's numbers", short_name: "Today", url: "/dashboard", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Transfers", short_name: "Transfers", url: "/dashboard/transfers", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
