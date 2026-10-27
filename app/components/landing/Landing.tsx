import Image from "next/image";
import Link from "next/link";
import { COPY, type Lang } from "../../../lib/landingCopy";
import { PAYMENTS_ENABLED } from "../../../lib/plans";
import { CONTACT_EMAIL } from "../../../lib/site";
import PricingBoard from "./PricingBoard";
import Ticket from "./Ticket";

const STEP_IMAGES = ["/Thai%20men%20receip%20cropped.png", "/Sabai%20Read%20It.png", "/See%20Your%20Profit.png"];

function Logo() {
  // The logo file has a wide empty margin; crop to the lettering.
  return (
    <span className="block h-9 w-[150px] overflow-hidden sm:h-10 sm:w-[168px]">
      <Image
        src="/sabaibiz-logo.png"
        alt="Sabai"
        width={2816}
        height={1536}
        sizes="170px"
        priority
        className="-mt-[22px] h-[84px] w-auto max-w-none -translate-x-[12px] sm:-mt-[24px] sm:h-[92px]"
      />
    </span>
  );
}

/** The public home page, in English (`/`) or Thai (`/th`). */
export default function Landing({ lang }: { lang: Lang }) {
  const t = COPY[lang];
  const signup = lang === "th" ? "/signup?lang=th" : "/signup";
  const login = lang === "th" ? "/login?lang=th" : "/login";

  return (
    <div lang={t.htmlLang} className="bg-white text-teal-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-teal-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <Link href={lang === "th" ? "/th" : "/"} aria-label="Sabai">
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-8 text-sm font-medium text-teal-900/80 md:flex">
            <a href="#how-it-works" className="transition hover:text-teal-950">
              {t.nav.how}
            </a>
            <a href="#pricing" className="transition hover:text-teal-950">
              {t.nav.pricing}
            </a>
            <a href="#security" className="transition hover:text-teal-950">
              {t.nav.security}
            </a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link
              href={t.nav.otherLang.href}
              hrefLang={lang === "th" ? "en" : "th"}
              className="rounded-full border border-teal-200 px-3 py-1.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
            >
              {t.nav.otherLang.label}
            </Link>
            <Link href={login} className="hidden rounded-full px-3 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 sm:block">
              {t.nav.signIn}
            </Link>
            <Link
              href={signup}
              className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 sm:px-5"
            >
              {t.nav.start}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-10 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] md:pb-24 md:pt-16 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-14">
            <div>
              <h1 className="text-[2.15rem] font-semibold leading-[1.12] tracking-tight sm:text-[2.6rem] lg:text-[2.85rem]">
                {t.hero.title.map((line) => (
                  <span key={line} className="block [text-wrap:balance]">
                    {line}
                  </span>
                ))}
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-teal-900/75">{t.hero.subtitle}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={signup}
                  className="rounded-full bg-gold-500 px-8 py-3.5 text-center text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400"
                >
                  {t.hero.primary}
                </Link>
                <a
                  href="#pricing"
                  className="rounded-full border border-teal-200 px-8 py-3.5 text-center text-lg font-semibold text-teal-800 transition hover:bg-teal-50"
                >
                  {t.hero.secondary}
                </a>
              </div>
              <p className="mt-4 text-sm text-teal-900/60">{t.hero.note}</p>
            </div>

            <div className="relative mx-auto mt-24 w-full max-w-[440px] pb-6 md:mt-0 md:max-w-none">
              <Image
                src="/Thaimen1.png"
                alt={t.hero.mascotAlt}
                width={1380}
                height={1349}
                sizes="(min-width: 768px) 460px, 80vw"
                priority
                className="ml-auto w-[82%] object-contain"
              />
              <Ticket copy={t.ticket} className="absolute bottom-0 left-0 w-[60%] max-w-[270px]" />
            </div>
          </div>
        </section>

        {/* How it works: a real sequence, so the steps are numbered */}
        <section id="how-it-works" className="scroll-mt-20 bg-teal-50 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{t.how.title}</h2>
            <ol className="mt-12 grid gap-12 md:-mx-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-dashed md:divide-teal-300">
              {t.how.steps.map((step, i) => (
                <li key={step.title} className="md:px-8">
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={STEP_IMAGES[i]}
                      alt={step.alt}
                      fill
                      sizes="(min-width: 768px) 360px, 90vw"
                      className={`object-contain ${i === 0 ? "mix-blend-multiply" : ""}`}
                    />
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <span className="num flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gold-500 text-sm font-bold text-teal-950">
                      {i + 1}
                    </span>
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                  </div>
                  <p className="mt-3 max-w-sm text-teal-900/75">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Invoices + till together */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
            <div>
              <h2 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">{t.together.title}</h2>
              <p className="mt-4 max-w-lg text-lg text-teal-900/75">{t.together.intro}</p>
              <dl className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2">
                {t.together.items.map((item) => (
                  <div key={item.title} className="border-t border-dashed border-teal-300 pt-4">
                    <dt className="font-semibold">{item.title}</dt>
                    <dd className="mt-1.5 text-sm text-teal-900/75">{item.text}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <ul className="flex flex-col justify-center gap-4 self-center">
              <Integration name="Loyverse" status={t.together.live} live>
                <Image src="/Loyverse%20logo.png" alt="" width={252} height={254} className="h-11 w-11 rounded-lg object-contain" />
              </Integration>
              <Integration name="Ocha" status={t.together.soon}>
                <Image src="/Ocha%20logo.jpg" alt="" width={447} height={447} className="h-11 w-11 rounded-lg object-cover" />
              </Integration>
              <Integration name="Grab" status={t.together.soon}>
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-100 text-lg font-bold text-teal-800">G</span>
              </Integration>
            </ul>
          </div>
        </section>

        {/* Built for owners */}
        <section className="bg-teal-50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{t.owners.title}</h2>
            <div className="mt-10 grid gap-10 md:-mx-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-dashed md:divide-teal-300">
              {t.owners.points.map((p) => (
                <div key={p.title} className="md:px-8">
                  <h3 className="text-xl font-semibold">{p.title}</h3>
                  <p className="mt-2 max-w-sm text-teal-900/75">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{t.pricing.title}</h2>
            <p className="mt-4 max-w-xl text-lg text-teal-900/75">{t.pricing.intro}</p>
            <PricingBoard copy={t.pricing} lang={lang} />
            <div className="mt-14 flex flex-col items-start gap-4 border-t border-dashed border-teal-300 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-teal-900/70">
                <p>{t.pricing.discounts}</p>
                {!PAYMENTS_ENABLED && <p className="mt-1">{t.pricing.payLater}</p>}
              </div>
              <Link
                href={signup}
                className="rounded-full bg-gold-500 px-8 py-3.5 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400"
              >
                {t.pricing.cta}
              </Link>
            </div>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="scroll-mt-20 bg-teal-950 py-16 text-white sm:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-6 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
            <div className="relative mx-auto aspect-[1414/960] w-full max-w-md">
              <Image
                src="/Confidentialite.png"
                alt={t.trust.mascotAlt}
                fill
                sizes="(min-width: 768px) 440px, 90vw"
                className="object-cover"
                style={{ objectPosition: "50% 52%" }}
              />
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.trust.title}</h2>
              <ul className="mt-7 space-y-4 text-lg text-teal-50/90">
                {t.trust.points.map((p) => (
                  <li key={p} className="flex gap-3">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-1.5 h-5 w-5 flex-none text-gold-400" aria-hidden>
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto grid max-w-5xl items-center gap-8 px-5 sm:px-6 md:grid-cols-[auto_1fr] md:gap-16">
            <div className="relative mx-auto aspect-[1414/1050] w-56 sm:w-72">
              <Image
                src="/Sabai.png"
                alt={t.closing.mascotAlt}
                fill
                sizes="288px"
                className="object-cover"
                style={{ objectPosition: "50% 45%" }}
              />
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.closing.title}</h2>
              <p className="mt-3 text-lg text-teal-900/75">{t.closing.text}</p>
              <Link
                href={signup}
                className="mt-7 inline-block rounded-full bg-gold-500 px-8 py-3.5 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400"
              >
                {t.closing.cta}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-teal-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-sm text-teal-900/60 sm:flex-row sm:px-6">
          <span>
            © {new Date().getFullYear()} Sabai. {t.footer.rights}
          </span>
          <div className="flex gap-6">
            <Link href="/privacy" className="transition hover:text-teal-800">
              {t.footer.privacy}
            </Link>
            <Link href="/terms" className="transition hover:text-teal-800">
              {t.footer.terms}
            </Link>
            {CONTACT_EMAIL && (
              <a href={`mailto:${CONTACT_EMAIL}`} className="transition hover:text-teal-800">
                {t.footer.contact}
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

function Integration({
  name,
  status,
  live = false,
  children,
}: {
  name: string;
  status: string;
  live?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-teal-100 bg-white px-5 py-4">
      {children}
      <span className="text-lg font-semibold">{name}</span>
      <span
        className={`ml-auto rounded-full px-3 py-1 text-sm font-semibold ${
          live ? "bg-teal-100 text-teal-800" : "bg-gold-100 text-gold-800"
        }`}
      >
        {status}
      </span>
    </li>
  );
}
