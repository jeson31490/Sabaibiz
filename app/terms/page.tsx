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
          SabaiBiz helps shops and restaurants record supplier invoices, track prices and see their money in and out. It is a
          management tool. It is not accounting, tax or legal advice and does not replace your accountant or your official tax
          documents.
        </p>
      </Section>

      <Section title="Check what Sabai reads">
        <p>
          Invoices are read automatically and can contain mistakes. You are responsible for checking the data before you rely on
          it or give it to your accountant. The same goes for costs and margins calculated from it.
        </p>
      </Section>

      <Section title="Plans, scans and payment">
        <p>
          Paid plans include a number of invoice scans per calendar month (Bangkok time). Every reading counts, including
          retries. The free plan does not include invoice reading. When the allowance is used up you can wait for the next month or move to a larger plan. Prices are shown in
          Thai baht. Paid plans open once online payment is available, and we show you the final price and billing terms
          before you pay. The free plan stays free.
        </p>
      </Section>

      <Section title="Your account and content">
        <p>
          Keep your sign-in private and tell us if someone else uses it. You own the invoices and data you upload, and you allow
          us to process them to provide the service. Upload only documents you are entitled to use.
        </p>
      </Section>

      <Section title="Third-party services">
        <p>
          SabaiBiz can connect to other services you use, such as your till. Their availability and rules are theirs, not ours.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>
          Do not misuse the service, try to reach another business&apos;s data, overload the service, or open several accounts to
          get around scan limits. We may suspend an account that does.
        </p>
      </Section>

      <Section title="Availability and liability">
        <p>
          We work to keep SabaiBiz running but cannot promise it will always be available or free of errors. To the extent
          Thai law allows, we are not liable for indirect losses, and our total liability is limited to what you paid us in the
          3 months before the claim.
        </p>
      </Section>

      <Section title="Ending your account">
        <p>You can stop using SabaiBiz at any time and ask us to delete your account. We can end the service with notice.</p>
      </Section>

      <Section title="Changes and law">
        <p>
          We may update these terms and will tell you about important changes in the app or by e-mail. These terms are governed
          by the laws of Thailand.
        </p>
      </Section>
    </LegalPage>
  );
}
