import Link from "next/link";
import { AUTH, type AuthLang } from "../../lib/authCopy";

/** Two tabs at the top of the sign-in and sign-up cards, so people can always switch from one to the other. */
export default function AuthTabs({ active, lang }: { active: "login" | "signup"; lang: AuthLang }) {
  const t = AUTH[lang];
  const q = lang === "en" ? "" : `?lang=${lang}`;
  const tab = (on: boolean) =>
    `flex-1 rounded-full px-4 py-2.5 text-center text-sm font-semibold transition ${
      on ? "bg-teal-700 text-white shadow-soft" : "text-teal-800 hover:bg-white"
    }`;
  return (
    <nav aria-label={`${t.signIn} / ${t.tabSignUp}`} className="mb-7 flex gap-1 rounded-full bg-teal-50 p-1">
      <Link href={`/login${q}`} aria-current={active === "login" ? "page" : undefined} className={tab(active === "login")}>
        {t.signIn}
      </Link>
      <Link href={`/signup${q}`} aria-current={active === "signup" ? "page" : undefined} className={tab(active === "signup")}>
        {t.tabSignUp}
      </Link>
    </nav>
  );
}
