import type { Metadata } from "next";
import LegalPage, { Section } from "../components/LegalPage";

export const metadata: Metadata = { title: "Privacy policy — SabaiBiz" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p className="mt-6 leading-relaxed text-teal-900/85">
        SabaiBiz is operated by Golden Truffle in Thailand. This page explains what we collect, why, who helps us process it,
        and your rights under the Thai Personal Data Protection Act (PDPA).
      </p>

      <Section title="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>Account details: name, e-mail address, password (kept hashed by our sign-in provider) and a profile photo if you add one.</li>
          <li>Business details you enter: business name, suppliers, ingredients, recipes and the team members you invite.</li>
          <li>Invoices: the photos or PDF files you upload, and the data read from them (supplier, date, products, quantities, prices).</li>
          <li>Sales data from your till, if you connect one (for example Loyverse). Your till access key is stored encrypted.</li>
          <li>Technical data needed to run the service, such as your sign-in session in your browser and error reports.</li>
        </ul>
        <p>Invoices can contain the names and details of your suppliers and, sometimes, of other people. Upload only what you need.</p>
      </Section>

      <Section title="Why we use it">
        <p>
          To read your invoices, track prices, show your money in and out, manage your plan and scan allowance, and keep the
          service secure. We do not sell your data and we do not use it for advertising.
        </p>
      </Section>

      <Section title="Who processes it for us">
        <ul className="list-disc space-y-1 pl-5">
          <li>Supabase: database, sign-in and file storage.</li>
          <li>Vercel: hosting of the website and application.</li>
          <li>
            Anthropic (Claude): when you scan an invoice, the image is sent to Anthropic&apos;s API so the text on it can be
            read. Under Anthropic&apos;s commercial terms, data sent through the API is not used to train its models.
          </li>
          <li>Your till provider, only if you connect it, to fetch your sales.</li>
          <li>An error-reporting service, only if we switch it on. Reports are set up not to include your invoices.</li>
          <li>A payment provider, once online payment opens. Card details go to the provider, not to us.</li>
        </ul>
        <p>
          These providers may process data outside Thailand. We choose providers that commit by contract to protect it.
        </p>
      </Section>

      <Section title="Who can see your data">
        <p>
          You and the team members you invite. Access is enforced in the database, so one business cannot read another
          business&apos;s data. Our own access is limited to what is needed to run and fix the service.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          While your account is open. If you ask us to delete your account, we delete your business data, except what the law
          requires us to keep.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You can ask to access, correct, export or delete your personal data, to object to or restrict how it is used, and to
          withdraw your consent. Write to us at the contact below. You may also complain to Thailand&apos;s Personal Data
          Protection Committee.
        </p>
      </Section>

      <Section title="Changes">
        <p>If we change this page in a way that matters to you, we tell you in the app or by e-mail.</p>
      </Section>
    </LegalPage>
  );
}
