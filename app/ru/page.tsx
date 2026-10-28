import type { Metadata } from "next";
import Landing from "../components/landing/Landing";
import { L2_COPY } from "../../lib/landing2";

export const metadata: Metadata = {
  title: { absolute: L2_COPY.ru.meta.title },
  description: L2_COPY.ru.meta.description,
  alternates: {
    canonical: "/ru",
    languages: { en: "/", fr: "/fr", th: "/th", ru: "/ru" },
  },
};

export default function Page() {
  return <Landing lang="ru" />;
}
