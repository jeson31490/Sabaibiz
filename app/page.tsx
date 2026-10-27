import type { Metadata } from "next";
import Landing from "./components/landing/Landing";
import { COPY } from "../lib/landingCopy";

export const metadata: Metadata = {
  title: { absolute: COPY.en.meta.title },
  description: COPY.en.meta.description,
  alternates: { canonical: "/", languages: { en: "/", th: "/th" } },
};

export default function HomePage() {
  return <Landing lang="en" />;
}
