import Link from "next/link";
import { L2_COPY, LANG_LABEL, LANG_PATH } from "../../../lib/landing2";
import type { Lang } from "../../../lib/landingCopy";
import { CONTACT_EMAIL } from "../../../lib/site";
import AiLogo from "./AiLogo";
import FeatureTabs from "./FeatureTabs";
import HubDiagram from "./HubDiagram";
import PlanSection from "./PlanSection";
import { Wordmark } from "./SabaiMark";
import { StepVisual, WhyIcon, whyColor } from "./Visuals";

const LANGS: Lang[] = ["en", "fr", "th", "ru"];

/** The public home page, in English (`/`), Thai (`/th`), French (`/fr`) or Russian (`/ru`). */
export default function Landing({ lang }: { lang: Lang }) {
  const t = L2_COPY[lang];
  const q = lang === "en" ? "" : `?lang=${lang}`;
  const signup = `/signup${q}`;
  const login = `/login${q}`;

  return (
    <div lang={t.htmlLang} className="bg-[#031B1C] font-sans text-[#F4EBD8]">

      <header className="sticky top-0 z-50 border-b border-[#19D3B5]/15 bg-[#031B1C]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <Link href={LANG_PATH[lang]} aria-label="SabaiBiz">
            <Wordmark id="nav" />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-7 text-sm font-medium text-[#F4EBD8]/80 md:flex">
            <a href="#what" className="hover:text-white">{t.nav.how}</a>
            <a href="#pricing" className="hover:text-white">{t.nav.pricing}</a>
            <a href="#security" className="hover:text-white">{t.nav.security}</a>
          </nav>
          <div className="flex items-center gap-2">
            <div role="group" aria-label={t.langs} className="hidden rounded-full border border-[#19D3B5]/30 p-0.5 sm:flex">
              {LANGS.map((l) => (
                <Link
                  key={l}
                  href={LANG_PATH[l]}
                  hrefLang={l}
                  aria-current={l === lang ? "page" : undefined}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${l === lang ? "bg-[#19D3B5] text-[#031B1C]" : "text-[#F4EBD8]/80 hover:text-white"}`}
                >
                  {LANG_LABEL[l]}
                </Link>
              ))}
            </div>
            <Link href={login} className="hidden px-3 py-2 text-sm font-semibold text-[#F4EBD8]/90 hover:text-white sm:block">
              {t.nav.signIn}
            </Link>
            <Link href={signup} className="rounded-full bg-[#E8B94A] px-4 py-2 text-sm font-bold text-[#031B1C] hover:brightness-110">
              {t.nav.start}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 pb-14 pt-14 sm:pt-20">
          <p className="font-plex text-xs font-medium tracking-widest text-[#19D3B5]">{t.hero.eyebrow}</p>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            {t.hero.lines.map((l, i) => (
              <span key={l} className={`block ${i === 1 ? "text-[#19D3B5]" : i === 2 ? "text-[#E8B94A]" : ""}`}>
                {l}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#F4EBD8]/80">{t.hero.sub}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={signup} className="rounded-full bg-[#E8B94A] px-7 py-3.5 text-base font-bold text-[#031B1C] hover:brightness-110">
              {t.hero.cta}
            </Link>
            <a href="#what" className="rounded-full border border-[#F4EBD8]/30 px-7 py-3.5 text-base font-semibold hover:bg-white/5">
              {t.hero.cta2}
            </a>
          </div>
          <p className="mt-4 text-sm text-[#F4EBD8]/60">{t.hero.note}</p>
          <div className="mt-12">
            <HubDiagram t={t.hub} />
          </div>
        </section>

        {/* Suite */}
        <section id="what" className="bg-[#F4EBD8] text-[#031B1C]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
            <h2 className="font-display text-3xl font-extrabold sm:text-5xl">{t.suite.title}</h2>
            <p className="mt-3 max-w-2xl text-lg text-[#031B1C]/70">{t.suite.intro}</p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {t.suite.items.map((it) => (
                <li key={it.t} className="rounded-3xl bg-white p-6 shadow-sm">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 font-plex text-[10px] font-bold ${
                      it.soon ? "bg-[#E8B94A]/40 text-[#7f5d00]" : "bg-[#19D3B5]/25 text-[#0a5a50]"
                    }`}
                  >
                    {it.soon ? t.suite.soon : t.suite.live}
                  </span>
                  <h3 className="mt-3 font-display text-xl font-bold">{it.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#031B1C]/70">{it.d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Tabs */}
        <section className="bg-gradient-to-b from-[#0E8F83] to-[#0A6B66]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
            <FeatureTabs tabs={t.tabs} />
          </div>
        </section>

        {/* Why */}
        <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <h2 className="font-display text-3xl font-extrabold sm:text-5xl">{t.why.title}</h2>
          <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {t.why.items.map((it, i) => (
              <li key={it.t} className="rounded-3xl border bg-[#072A2B] p-6" style={{ borderColor: `${whyColor(i)}55` }}>
                <WhyIcon i={i} />
                <h3 className="mt-4 font-display text-xl font-bold" style={{ color: whyColor(i) }}>{it.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#F4EBD8]/75">{it.d}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section className="bg-[#072A2B]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
            <h2 className="text-center font-display text-3xl font-extrabold sm:text-5xl">{t.steps.title}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-lg text-[#F4EBD8]/75">{t.steps.intro}</p>
            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              {t.steps.items.map((it, i) => (
                <li key={it.t} className="relative rounded-3xl border border-[#19D3B5]/20 bg-[#031B1C] p-5">
                  {i < 2 && <span className="absolute -right-4 top-28 z-10 hidden h-8 w-8 items-center justify-center rounded-full bg-[#E8B94A] font-bold text-[#031B1C] md:flex" aria-hidden>→</span>}
                  <StepVisual i={i} />
                  <h3 className="mt-6 font-display text-2xl font-bold">{it.t}</h3>
                  <p className="mt-2 leading-relaxed text-[#F4EBD8]/75">{it.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Connector */}
        <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-20 md:grid-cols-2">
          <div>
            <span className="rounded-full border border-[#E8B94A] px-3 py-1 font-plex text-[11px] font-bold text-[#E8B94A]">{t.connector.badge}</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">{t.connector.title}</h2>
            <p className="mt-3 text-[#F4EBD8]/75">{t.connector.text}</p>
          </div>
          <div className="space-y-3 self-center rounded-3xl bg-[#072A2B] p-6">
            <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-[#19D3B5] px-4 py-3 text-sm font-medium text-[#031B1C]">{t.connector.ask}</p>
            <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm border border-[#F4EBD8]/15 px-4 py-3 text-sm">{t.connector.answer}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-center font-plex text-xs tracking-widest text-[#F4EBD8]/60">{t.connector.works.toUpperCase()}</p>
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-5">
              {t.connector.logos.map((n) => (
                <li key={n} className="flex items-center gap-3 rounded-full border border-[#F4EBD8]/20 bg-[#072A2B] px-6 py-3 font-display text-lg font-bold tracking-tight sm:text-2xl">
                  <AiLogo name={n} />
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
          <h2 className="text-center font-display text-3xl font-extrabold sm:text-5xl">{t.pricing.title}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-lg text-[#F4EBD8]/75">{t.pricing.intro}</p>
          <div className="mt-10">
            <PlanSection t={t.pricing} lang={lang} signup={signup} />
          </div>
        </section>

        {/* Security */}
        <section id="security" className="bg-[#072A2B]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
            <h2 className="font-display text-3xl font-extrabold sm:text-4xl">{t.security.title}</h2>
            <ul className="mt-10 grid gap-5 md:grid-cols-3">
              {t.security.items.map((s) => (
                <li key={s.t} className="rounded-3xl border border-[#19D3B5]/25 p-6">
                  <p className="font-display text-5xl font-extrabold text-[#E8B94A]">{s.n}</p>
                  <h3 className="mt-2 font-display text-xl font-bold">{s.t}</h3>
                  <p className="mt-1 text-sm text-[#F4EBD8]/75">{s.d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final call */}
        <section className="bg-[#E8B94A] text-[#031B1C]">
          <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:py-24">
            <h2 className="font-display text-4xl font-extrabold sm:text-6xl">{t.final.title}</h2>
            <p className="mt-4 text-lg">{t.final.text}</p>
            <Link href={signup} className="mt-8 inline-block rounded-full bg-[#031B1C] px-8 py-4 text-base font-bold text-[#F4EBD8] hover:opacity-90">
              {t.final.cta}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#19D3B5]/15 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-sm text-[#F4EBD8]/70 sm:flex-row">
          <p>
            © {new Date().getFullYear()} SabaiBiz. {t.footer.rights}
          </p>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-5">
            <Link href="/faq" className="hover:text-white">{t.footer.faq}</Link>
            <Link href="/privacy" className="hover:text-white">{t.footer.privacy}</Link>
            <Link href="/terms" className="hover:text-white">{t.footer.terms}</Link>
            {CONTACT_EMAIL && <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">{CONTACT_EMAIL}</a>}
            <span className="flex gap-2 sm:hidden">
              {LANGS.map((l) => (
                <Link key={l} href={LANG_PATH[l]} hrefLang={l} className={l === lang ? "font-bold text-[#19D3B5]" : ""}>
                  {LANG_LABEL[l]}
                </Link>
              ))}
            </span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
