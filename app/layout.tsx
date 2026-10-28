import type { Metadata, Viewport } from "next";
import "@fontsource/prompt/latin-400.css";
import "@fontsource/prompt/latin-500.css";
import "@fontsource/prompt/latin-600.css";
import "@fontsource/prompt/latin-700.css";
import "@fontsource/prompt/thai-400.css";
import "@fontsource/prompt/thai-500.css";
import "@fontsource/prompt/thai-600.css";
import "@fontsource/prompt/thai-700.css";
import "@fontsource/bricolage-grotesque/latin-600.css";
import "@fontsource/bricolage-grotesque/latin-700.css";
import "@fontsource/bricolage-grotesque/latin-800.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./globals.css";
import { UserProvider } from "./context/UserContext";

export const metadata: Metadata = {
  metadataBase: new URL("https://sabaibiz.com"),
  icons: { apple: "/apple-touch-icon.png" },
  title: {
    default: "Sabai: photograph your invoices, see today's money in and out",
    template: "%s · Sabai",
  },
  description:
    "Sabai reads your supplier invoices, adds your till sales and shows what came in and went out today.",
};

export const viewport: Viewport = {
  themeColor: "#031b1c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
