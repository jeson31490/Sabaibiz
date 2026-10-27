import type { Metadata } from "next";
import LegalPage, { Section } from "../components/LegalPage";

export const metadata: Metadata = { title: "Privacy policy — SabaiBiz" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p className="mt-6 leading-relaxed text-teal-900/85">
        SabaiBiz is operated by Golden Truffle (&quot;we&quot;) in Thailand. This page explains what we collect, why, who
        helps us process it, and your rights under the Thai Personal Data Protection Act (PDPA).
      </p>

      <Section title="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>Account details: name, email address, password (stored hashed by our sign-in provider), profile photo if you add one.</li>
          <li>Business details you enter: business name, suppliers, ingredients, team members you invite.</li>
          <li>Invoices: the photos or files you upload, and the data read from them (supplier, date, products, quantities, prices).</li>
          <li>Sales data from your till, if you connect one (for example Loyverse). Your till access key is stored encrypted.</li>
          <li>Basic technical data needed to run the service, such as error reports.</li>
        </ul>
      </Section>

      <Section title="Why we use it">
        <p>
          To read your invoices, track prices, show your daily money in and out, manage your plan and scan allowance, and keep
          the service secure. We do not sell your data and we do not use it for advertising.
        </p>
      </Section>

      <Section title="Who processes it for us">
        <ul className="list-disc space-y-1 pl-5">
          <li>Supabase: database, sign-in and file storage.</li>
          <li>Vercel: hosting of the website and application.</li>
          <li>
            Anthropic (Claude): when you scan an invoice, the image is sent to Anthropic&apos;s API so the text can be read.
            We use it only to return the extracted data to you.
          </li>
          <li>Your till provider, only if you connect it, to fetch your sales.</li>
        </ul>
        <p>These providers may process data outside Thailand. We choose providers that protect data under contract.</p>
      </Section>

      <Section title="Who can see your data">
        <p>
          Only you and the team members you invite to your business. Access is enforced in the database so one business can
          never read another&apos;s data.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          While your account is open. If you ask us to delete your account, we delete your business data, except what we must
          keep by law.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You can ask to access, correct, export or delete your personal data, to object to or restrict its use, and to
          withdraw consent. Write to us at the contact below. You may also complain to Thailand&apos;s Personal Data
          Protection Committee.
        </p>
      </Section>
    </LegalPage>
  );
}
