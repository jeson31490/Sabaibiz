import type { Metadata } from "next";
import Landing from "../components/landing/Landing";
import { COPY } from "../../lib/landingCopy";

export const metadata: Metadata = {
  title: { absolute: COPY.th.meta.title },
  description: COPY.th.meta.description,
  alternates: { canonical: "/th", languages: { en: "/", th: "/th" } },
};

export default function ThaiHomePage() {
  return <Landing lang="th" />;
}
