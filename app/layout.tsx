import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "./context/UserContext";

export const metadata: Metadata = {
  title: {
    default: "Sabai — Photograph your invoices. Sabai does the accounting.",
    template: "%s · Sabai",
  },
  description:
    "Know your real profit on every dish, every day, without spreadsheets.",
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
