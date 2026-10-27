import type { Metadata } from "next";
import LegalPage, { Section } from "../components/LegalPage";

export const metadata: Metadata = { title: "Terms of use — SabaiBiz" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use">
      <p className="mt-6 leading-relaxed text-teal-900/85">
        By creating an account you agree to these terms. SabaiBiz is operated by Golden Truffle in Thailand.
      </p>

      <Section title="The service">
        <p>
          SabaiBiz helps shops and restaurants record supplier invoices, track prices and see daily money in and out. It is a
          management tool. It is not accounting, tax or legal advice and does not replace your accountant or official tax
          documents.
        </p>
      </Section>

      <Section title="Check what Sabai reads">
        <p>
          Invoices are read automatically and can contain mistakes. You are responsible for checking the data before you rely
          on it or pass it to your accountant.
        </p>
      </Section>

      <Section title="Plans, scans and payment">
        <p>
          Each plan includes a number of invoice scans per calendar month (Bangkok time). Every reading counts, including
          retries. When the allowance is used up you can scan again next month or move to a larger plan. Prices are shown in
          Thai baht. Paid plans open once online payment is available; we will show the final price and billing terms before
          you pay.
        </p>
      </Section>

      <Section title="Your account and content">
        <p>
          Keep your sign-in private. You own the invoices and data you upload and you allow us to process them to provide the
          service. Only upload documents you are entitled to use.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>
          Do not misuse the service, attempt to access other businesses&apos; data, overload it, or create several accounts to
          avoid scan limits. We may suspend accounts that do.
        </p>
      </Section>

      <Section title="Availability and liability">
        <p>
          We work to keep SabaiBiz running but cannot promise it will always be available or error-free. To the extent the law
          allows, we are not liable for indirect losses, and our total liability is limited to what you paid us in the 3
          months before the claim.
        </p>
      </Section>

      <Section title="Changes and law">
        <p>
          We may update these terms and will tell you about important changes. You can close your account at any time. These
          terms are governed by the laws of Thailand.
        </p>
      </Section>
    </LegalPage>
  );
}
