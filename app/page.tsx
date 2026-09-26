import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Sabai — Photograph your invoices. Sabai does the accounting.",
  description:
    "Know your real profit on every dish, every day, without spreadsheets.",
};

/* -------------------------------------------------------------------------- */
/*  Icons (inline SVG, no external dependency)                                */
/* -------------------------------------------------------------------------- */

function IconCamera(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8.5A1.5 1.5 0 0 1 5.5 7h1.6l.9-1.6A1.5 1.5 0 0 1 9.3 4.5h5.4a1.5 1.5 0 0 1 1.3.9l.9 1.6h1.6A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
      <circle cx="12" cy="13" r="3.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconScan(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2M20 8V6a2 2 0 0 0-2-2h-2M20 16v2a2 2 0 0 1-2 2h-2M7 12h10M9 8.5h6M9 15.5h4" />
    </svg>
  );
}

function IconChart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20V4M4 20h16M8 16v-4M12.5 16V8M17 16v-7" />
    </svg>
  );
}

function IconShield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5 5 6v5.4c0 4.4 3 7.9 7 9.1 4-1.2 7-4.7 7-9.1V6l-7-2.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.25 12 1.9 1.9 3.6-3.8" />
    </svg>
  );
}

function IconSparkles(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5 13.4 8l4.6 1.4-4.6 1.4L12 15.3l-1.4-4.5L6 9.4 10.6 8 12 3.5ZM5 15.5l.8 2.2 2.2.8-2.2.8L5 21.5l-.8-2.2-2.2-.8 2.2-.8.8-2.2ZM18.5 14.5l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6.6-1.7Z" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared bits                                                               */
/* -------------------------------------------------------------------------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
  return (
    <main className="bg-white text-teal-950">
      {/* ---------------------------------------------------------------- */}
      {/* Nav                                                              */}
      {/* ---------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 border-b border-teal-100/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
          <div className="flex items-center gap-1">
            <Image
              src="/Thaimen1.png"
              alt="Sabai mascot"
              width={1380}
              height={1349}
              sizes="66px"
              quality={90}
              className="h-16 w-auto object-contain"
              priority
            />
            <Image
              src="/sabaibiz-logo.png"
              alt="Sabai logo"
              width={2816}
              height={1536}
              sizes="300px"
              quality={90}
              className="h-20 w-auto object-contain"
              priority
            />
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-teal-700/80 md:flex">
            <a href="#how-it-works" className="transition hover:text-teal-900">
              How it works
            </a>
            <a href="#trust" className="transition hover:text-teal-900">
              Security
            </a>
            <a href="#pos" className="transition hover:text-teal-900">
              Integrations
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 hover:text-teal-900"
            >
              Sign in
            </a>
            <a
              href="/signup"
              className="rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-teal-800"
            >
              Get started
            </a>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Block 1 + 2 — Hero: title + subtitle                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(39,148,136,0.12),transparent)]"
        />
        <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-20 text-center sm:pb-28 sm:pt-28">
          <SectionLabel>AI accounting for restaurants &amp; shops</SectionLabel>
          <h1 className="mt-6 text-5xl font-bold leading-[1.1] lg:text-7xl tracking-tight text-teal-950">
            Run your business.
            <br />
            <span className="text-teal-600">We handle the numbers.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-teal-900/70 sm:text-xl">
            Know your real profit on every dish, every day, without spreadsheets.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              id="get-started"
              href="/signup"
              className="w-full rounded-full bg-gold-500 px-8 py-4 text-lg font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400 sm:w-auto"
            >
              Start free trial
            </a>
            <a
              href="#how-it-works"
              className="w-full rounded-full border border-teal-200 px-8 py-4 text-lg font-semibold text-teal-800 transition hover:border-teal-300 hover:bg-teal-50 sm:w-auto"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Block 3 + 4 + 5 — How it works (3 steps)                         */}
      {/* ---------------------------------------------------------------- */}
      <section id="how-it-works" className="bg-teal-50/60 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>How it works</SectionLabel>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-teal-950 sm:text-4xl">
              Three steps. Zero spreadsheets.
            </h2>
          </div>

          <div className="mt-20 grid gap-6 sm:mt-28 md:grid-cols-3">
            {[
              {
                icon: IconCamera,
                step: "01",
                title: "Open the app and snap a photo of your invoice.",
                copy: "Use your phone, right at the delivery door. No scanner, no typing, no filing cabinet.",
                img: {
                  src: "/Thai%20men%20receip%20cropped.png",
                  alt: "Mascot snapping a photo of an invoice",
                  fit: "object-center",
                  origin: "center",
                  transform: "translateY(40px) scale(1.265)",
                },
              },
              {
                icon: IconScan,
                step: "02",
                title: "Sabai reads it and tracks every price automatically",
                copy: "Products, quantities, and prices are extracted by AI and logged the moment the photo lands.",
                img: {
                  src: "/Sabai%20Read%20It.png",
                  alt: "Mascot reading an invoice",
                  fit: "object-bottom",
                  origin: "50% 100%",
                  transform: "scale(1.2)",
                },
              },
              {
                icon: IconChart,
                step: "03",
                title: "See your income, your costs, your profit. In seconds.",
                copy: "Ingredient costs roll up into true margins per dish, updated automatically as prices move.",
                img: {
                  src: "/See%20Your%20Profit.png",
                  alt: "Mascot showing your profit",
                  fit: "object-center",
                  origin: "center",
                  transform: "translateY(40px) scale(1.1)",
                },
              },
            ].map(({ icon: Icon, step, title, copy, img }) => (
              <div
                key={step}
                className="relative flex flex-col rounded-2xl border border-teal-100 h-full overflow-hidden bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-soft"
              >
                {img && (
                  <div className="-mt-9 h-[300px] w-full flex-none overflow-hidden px-6">
                    <div className="relative h-full w-full">
                      <Image
                        src={img.src}
                        alt={img.alt}
                        fill
                        sizes="(min-width: 768px) 320px, 100vw"
                        className={`object-contain ${img.fit}`}
                        style={{ transform: img.transform, transformOrigin: img.origin }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex-1 px-8 pb-8 pt-3">
                  <span className="text-sm font-bold text-gold-500">{step}</span>
                  <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-700 text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-teal-950">{title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-teal-900/65">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Block 6 — Privacy / trust strip                                  */}
      {/* ---------------------------------------------------------------- */}
      <section id="trust" className="py-[33px]">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-teal-100 bg-teal-950 px-8 py-[31px] text-center shadow-soft sm:flex-row sm:gap-8 sm:px-12 sm:text-left">
            <Image
              src="/Confidentialite.png"
              alt="Mascot guarding your data"
              width={1414}
              height={2000}
              sizes="265px"
              className="h-[375px] w-auto flex-none object-contain"
            />
            <div>
              <h3 className="text-4xl font-bold text-white">Your data stays yours.</h3>
              <p className="mt-1.5 text-base text-teal-100/80">
                Encrypted, private, never shared.
              </p>
              <p className="mx-auto mt-4 max-w-[600px] text-center text-sm leading-relaxed text-white/70">
                Your business data is hosted on private servers, never sold, never shared with
                third parties. What happens in SabaiBiz, stays in SabaiBiz.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Block 7 — AI value proposition                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-teal-50/60 py-[54px]">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid items-center gap-8 lg:grid-cols-[auto_1fr_300px]">
            <Image
              src="/Equipe%20IA.png"
              alt="The Sabai AI team"
              width={1414}
              height={2000}
              sizes="247px"
              className="mx-auto h-[350px] w-auto object-contain"
            />
            <div>
              <SectionLabel>One AI, every role</SectionLabel>
              <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-teal-950 sm:text-4xl">
                Your accountant, your analyst, your stock manager — all in one AI.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-teal-900/70">
                Working for you 24 hours a day, so nothing slips through while you&apos;re
                running the floor.
              </p>
            </div>
            <div>
              <div className="grid grid-cols-2 gap-4">
              {[
                { icon: IconChart, label: "Accountant" },
                { icon: IconSparkles, label: "Analyst" },
                { icon: IconScan, label: "Stock manager" },
                { icon: IconShield, label: "24/7 on duty" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-start gap-3 rounded-xl bg-white p-5 shadow-card"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-100 text-gold-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold text-teal-900">{label}</span>
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Block 8 — POS integration                                        */}
      {/* ---------------------------------------------------------------- */}
      <section id="pos" className="py-[33px]">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="relative order-2 h-[350px] w-full md:order-1">
              <Image
                src="/sabaibiz%20apps.png"
                alt="SabaiBiz connected to POS systems and supplier invoices"
                fill
                sizes="(min-width: 1024px) 464px, 100vw"
                className="object-contain object-left"
              />
            </div>
            <div className="order-1 md:order-2">
              <SectionLabel>Integrations</SectionLabel>
              <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-teal-950 sm:text-4xl">
                Connects straight to your POS.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-teal-900/70">
                Your sales and your costs, finally in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Closing CTA                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-teal-950 py-2 text-center md:text-left">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-6 md:flex-row md:gap-14">
          <Image
            src="/Sabai.png"
            alt="Sabai mascot"
            width={1414}
            height={2000}
            sizes="283px"
            className="h-[400px] w-auto flex-none object-contain"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Stop guessing your margins.
            </h2>
            <p className="mt-4 text-lg text-teal-100/70">
              Set up Sabai in a few minutes — your first real profit numbers today.
            </p>
            <a
              href="#get-started"
              className="mt-8 inline-block rounded-full bg-gold-500 px-8 py-3.5 text-base font-semibold text-teal-950 shadow-soft transition hover:bg-gold-400"
            >
              Start free trial
            </a>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-teal-100 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-teal-900/50 sm:flex-row">
          <span>© {new Date().getFullYear()} Sabai. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="transition hover:text-teal-700">
              Privacy
            </a>
            <a href="#" className="transition hover:text-teal-700">
              Terms
            </a>
            <a href="#" className="transition hover:text-teal-700">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
