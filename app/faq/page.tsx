import type { Metadata } from "next";
import LegalPage, { Section } from "../components/LegalPage";

export const metadata: Metadata = { title: "Questions and answers — SabaiBiz" };

const QA: { q: string; a: string }[] = [
  {
    q: "What does SabaiBiz do?",
    a: "You photograph a supplier invoice, Sabai reads it (supplier, date, products, quantities, prices), and keeps the history. Connect your till (Loyverse) and you also see the day's sales next to what you bought.",
  },
  {
    q: "What can I scan?",
    a: "A photo (JPG, PNG, WebP) or a PDF. An invoice can have up to 4 pages.",
  },
  {
    q: "Is the reading always right?",
    a: "No. Handwriting, folds and blurry photos cause mistakes. Check the lines before you save: prices that look unusual are flagged for you.",
  },
  {
    q: "How are scans counted?",
    a: "Every reading counts, including a retry of the same invoice. The count is per calendar month in Bangkok time and starts again on the 1st. You can see what is left in Settings, under Subscription Details.",
  },
  {
    q: "What happens when I use all my scans?",
    a: "Scanning pauses until the 1st of next month, or until you move to a bigger plan. Your invoices, prices and history stay available.",
  },
  {
    q: "Can I pay for a plan now?",
    a: "Online payment is not open yet. Paid plans open inside the app as soon as it is.",
  },
  {
    q: "How do I give my accountant my invoices?",
    a: "Open Invoices, filter by date or supplier if you want, and use the export button to download a CSV file. It opens in Excel and Google Sheets.",
  },
  {
    q: "Who can see my data?",
    a: "You and the team members you invite. One business can never read another business's data.",
  },
  {
    q: "Where do my invoice photos go?",
    a: "To our hosting and database providers, and to Anthropic's Claude API, which reads the text on the invoice. The privacy policy lists the details.",
  },
  {
    q: "How do I add my staff?",
    a: "In Settings, open Team Access and invite them by e-mail. Employees are free but capped by plan (10 on Solo, 20 on Team, 50 on Tracker); managers come with the Team and Tracker plans.",
  },
  {
    q: "What are recipes and margins?",
    a: "On the Tracker plan, you list what goes into a dish and Sabai works out its cost from your latest invoice prices, then shows what you keep per sale.",
  },
  {
    q: "How do I delete my account or my data?",
    a: "Ask us using the contact details below. We delete your business data unless the law requires us to keep part of it.",
  },
];

export default function FaqPage() {
  return (
    <LegalPage title="Questions and answers" showUpdated={false}>
      {QA.map(({ q, a }) => (
        <Section key={q} title={q}>
          <p>{a}</p>
        </Section>
      ))}
    </LegalPage>
  );
}
