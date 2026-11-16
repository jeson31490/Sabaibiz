// Zero-cost help bot: no API, no AI call. It scores the visitor's words against a fixed list of answers
// that mirror /faq and lib/plans.ts, so it can never invent a price or a promise. Runs fully in the browser.
import { CONTACT_EMAIL } from "./site";

export type Lang = "en" | "th" | "fr";
type Text = Record<Lang, string>;
type Entry = { id: string; keywords: string[]; q: Text; a: Text };

const contact: Text = {
  en: CONTACT_EMAIL ? `Write to us at ${CONTACT_EMAIL}.` : "Use the contact details in your SabaiBiz account.",
  th: CONTACT_EMAIL ? `ส่งอีเมลถึงเราที่ ${CONTACT_EMAIL}` : "ใช้ช่องทางติดต่อในบัญชี SabaiBiz ของคุณ",
  fr: CONTACT_EMAIL ? `Écrivez-nous à ${CONTACT_EMAIL}.` : "Utilisez les coordonnées dans votre compte SabaiBiz.",
};

const ENTRIES: Entry[] = [
  { id: "what", keywords: ["what is", "what does", "sabai", "about", "คืออะไร", "ทำอะไร", "c'est quoi", "à quoi", "fonctionne"],
    q: { en: "What does SabaiBiz do?", th: "SabaiBiz ทำอะไร?", fr: "À quoi sert SabaiBiz ?" },
    a: { en: "You photograph a supplier invoice, Sabai reads it (supplier, date, products, quantities, prices) and keeps the history. Connect your till (Loyverse) to see the day's sales next to what you bought.",
         th: "ถ่ายรูปใบแจ้งหนี้จากซัพพลายเออร์ Sabai จะอ่านข้อมูล (ซัพพลายเออร์ วันที่ สินค้า จำนวน ราคา) และเก็บประวัติให้ เชื่อมต่อระบบขาย (Loyverse) เพื่อดูยอดขายของวันเทียบกับสิ่งที่ซื้อ",
         fr: "Vous photographiez une facture fournisseur, Sabai la lit (fournisseur, date, produits, quantités, prix) et garde l'historique. Reliez votre caisse (Loyverse) pour voir les ventes du jour à côté de vos achats." } },
  { id: "price", keywords: ["price", "cost", "plan", "pricing", "how much", "baht", "subscription", "ราคา", "แพ็กเกจ", "แพ็คเกจ", "เท่าไร", "บาท", "prix", "tarif", "combien", "abonnement", "forfait"],
    q: { en: "How much does it cost?", th: "ราคาเท่าไร?", fr: "Combien ça coûte ?" },
    a: { en: "Free: 0 baht (manual entry). Solo: 149 baht/month, 15 scans. Team: 249 baht/month, 25 scans, owner + 2 managers. Tracker: 499 baht/month, 50 scans, unlimited managers. Employees are free. Yearly saves 20%.",
         th: "ฟรี: 0 บาท (กรอกเอง) Solo: 149 บาท/เดือน สแกน 15 ครั้ง Team: 249 บาท/เดือน สแกน 25 ครั้ง เจ้าของ + ผู้จัดการ 2 คน Tracker: 499 บาท/เดือน สแกน 50 ครั้ง ผู้จัดการไม่จำกัด พนักงานไม่มีค่าใช้จ่าย จ่ายรายปีลด 20%",
         fr: "Gratuit : 0 baht (saisie manuelle). Solo : 149 baht/mois, 15 scans. Team : 249 baht/mois, 25 scans, propriétaire + 2 managers. Tracker : 499 baht/mois, 50 scans, managers illimités. Les employés sont gratuits. Annuel : -20 %." } },
  { id: "pay", keywords: ["pay", "payment", "card", "promptpay", "truemoney", "buy", "จ่าย", "ชำระ", "paiement", "payer", "carte"],
    q: { en: "Can I pay for a plan now?", th: "จ่ายเงินสมัครแพ็กเกจได้เลยไหม?", fr: "Puis-je payer un forfait maintenant ?" },
    a: { en: "Online payment is not open yet. Paid plans open as soon as it is.",
         th: "ยังไม่เปิดให้ชำระเงินออนไลน์ แพ็กเกจแบบชำระเงินจะเปิดทันทีที่พร้อม",
         fr: "Le paiement en ligne n'est pas encore ouvert. Les forfaits payants ouvrent dès qu'il l'est." } },
  { id: "scan", keywords: ["scan", "photo", "pdf", "pages", "invoice", "bill", "receipt", "สแกน", "ใบแจ้งหนี้", "บิล", "ใบเสร็จ", "facture", "scanner", "reçu"],
    q: { en: "What can I scan?", th: "สแกนอะไรได้บ้าง?", fr: "Que puis-je scanner ?" },
    a: { en: "A photo (JPG, PNG, WebP) or a PDF. An invoice can have up to 4 pages. Every reading counts toward your monthly scans, including a retry.",
         th: "รูปถ่าย (JPG, PNG, WebP) หรือไฟล์ PDF ใบแจ้งหนี้มีได้สูงสุด 4 หน้า ทุกครั้งที่อ่านนับเป็นโควตารายเดือน รวมถึงการลองใหม่",
         fr: "Une photo (JPG, PNG, WebP) ou un PDF. Une facture peut avoir jusqu'à 4 pages. Chaque lecture compte dans vos scans mensuels, y compris un nouvel essai." } },
  { id: "accuracy", keywords: ["accurate", "right", "wrong", "mistake", "error", "correct", "แม่น", "ผิด", "ถูกต้อง", "erreur", "fiable", "précis"],
    q: { en: "Is the reading always right?", th: "อ่านถูกต้องเสมอไหม?", fr: "La lecture est-elle toujours juste ?" },
    a: { en: "No. Handwriting, folds and blurry photos cause mistakes. Check the lines before you save: unusual prices are flagged for you.",
         th: "ไม่เสมอไป ลายมือ รอยพับ และภาพเบลอทำให้ผิดพลาดได้ ตรวจรายการก่อนบันทึก ราคาที่ดูผิดปกติจะถูกแจ้งเตือน",
         fr: "Non. L'écriture manuscrite, les plis et les photos floues causent des erreurs. Vérifiez les lignes avant d'enregistrer : les prix inhabituels sont signalés." } },
  { id: "staff", keywords: ["staff", "employee", "team", "manager", "invite", "พนักงาน", "ทีม", "ผู้จัดการ", "équipe", "employé", "inviter"],
    q: { en: "How do I add my staff?", th: "เพิ่มพนักงานอย่างไร?", fr: "Comment ajouter mon équipe ?" },
    a: { en: "In Settings, open Team Access and invite them by e-mail. Employees are free but capped by plan (10 Solo, 20 Team, 50 Tracker); managers come with Team and Tracker.",
         th: "ที่ตั้งค่า เปิด Team Access แล้วเชิญทางอีเมล พนักงานไม่มีค่าใช้จ่ายแต่จำกัดตามแพ็กเกจ (Solo 10, Team 20, Tracker 50) ผู้จัดการมีใน Team และ Tracker",
         fr: "Dans Réglages, ouvrez Team Access et invitez par e-mail. Les employés sont gratuits mais limités par forfait (10 Solo, 20 Team, 50 Tracker) ; les managers sont dans Team et Tracker." } },
  { id: "margin", keywords: ["recipe", "margin", "profit", "dish", "menu", "สูตร", "กำไร", "เมนู", "marge", "recette", "plat", "bénéfice"],
    q: { en: "What are recipes and margins?", th: "สูตรและกำไรคืออะไร?", fr: "Que sont les recettes et marges ?" },
    a: { en: "On the Tracker plan, you list what goes into a dish and Sabai works out its cost from your latest invoice prices, then shows what you keep per sale.",
         th: "ในแพ็กเกจ Tracker คุณระบุวัตถุดิบของแต่ละเมนู Sabai จะคำนวณต้นทุนจากราคาในใบแจ้งหนี้ล่าสุด แล้วแสดงกำไรต่อการขาย",
         fr: "Avec le forfait Tracker, vous listez ce qui entre dans un plat et Sabai calcule son coût d'après vos derniers prix de facture, puis montre ce qu'il vous reste par vente." } },
  { id: "pos", keywords: ["loyverse", "pos", "till", "ocha", "grab", "ระบบขาย", "caisse"],
    q: { en: "Does it connect to my till?", th: "เชื่อมต่อระบบขายได้ไหม?", fr: "Se connecte-t-il à ma caisse ?" },
    a: { en: "Loyverse is supported on paid plans; Ocha and others are planned.",
         th: "รองรับ Loyverse ในแพ็กเกจแบบชำระเงิน ส่วน Ocha และอื่นๆ อยู่ในแผน",
         fr: "Loyverse est pris en charge sur les forfaits payants ; Ocha et d'autres sont prévus." } },
  { id: "privacy", keywords: ["privacy", "data", "secure", "safe", "see my", "who can", "ข้อมูล", "ความเป็นส่วนตัว", "ปลอดภัย", "données", "sécurité", "confidentialité"],
    q: { en: "Who can see my data?", th: "ใครเห็นข้อมูลของฉันได้บ้าง?", fr: "Qui peut voir mes données ?" },
    a: { en: "You and the team members you invite. One business can never read another business's data. Invoice photos go to our hosting and database providers and to Anthropic's Claude API, which reads the invoice; see the privacy policy for details.",
         th: "คุณและสมาชิกทีมที่คุณเชิญเท่านั้น ธุรกิจหนึ่งไม่สามารถอ่านข้อมูลของอีกธุรกิจได้ รูปใบแจ้งหนี้ถูกส่งไปยังผู้ให้บริการโฮสติ้งและฐานข้อมูล และ Claude API ของ Anthropic เพื่ออ่านบิล ดูรายละเอียดในนโยบายความเป็นส่วนตัว",
         fr: "Vous et les membres que vous invitez. Une entreprise ne peut jamais lire les données d'une autre. Les photos de factures vont à nos hébergeurs et à l'API Claude d'Anthropic, qui lit la facture ; voir la politique de confidentialité." } },
  { id: "delete", keywords: ["delete", "remove account", "close account", "ลบ", "ปิดบัญชี", "supprimer", "suppression"],
    q: { en: "How do I delete my account?", th: "ลบบัญชีอย่างไร?", fr: "Comment supprimer mon compte ?" },
    a: { en: "In the app: Settings → Delete my account (you must have signed in within the last 5 minutes).",
         th: "ในแอป: ตั้งค่า → ลบบัญชีของฉัน (ต้องเข้าสู่ระบบภายใน 5 นาทีที่ผ่านมา)",
         fr: "Dans l'app : Réglages → Supprimer mon compte (connexion de moins de 5 minutes requise)." } },
  { id: "export", keywords: ["export", "csv", "excel", "accountant", "sheet", "ส่งออก", "นักบัญชี", "comptable", "exporter"],
    q: { en: "How do I give my accountant my invoices?", th: "ส่งบิลให้นักบัญชีอย่างไร?", fr: "Comment donner mes factures au comptable ?" },
    a: { en: "Open Invoices, filter by date or supplier if you want, and use the export button to download a CSV file. It opens in Excel and Google Sheets.",
         th: "เปิด Invoices กรองตามวันที่หรือซัพพลายเออร์ แล้วกดปุ่มส่งออกเพื่อดาวน์โหลดไฟล์ CSV เปิดได้ใน Excel และ Google Sheets",
         fr: "Ouvrez Factures, filtrez par date ou fournisseur si besoin, puis exportez en CSV. Il s'ouvre dans Excel et Google Sheets." } },
  { id: "contact", keywords: ["contact", "support", "human", "talk", "email", "help", "ติดต่อ", "ช่วยเหลือ", "aide", "joindre", "humain"],
    q: { en: "How do I contact you?", th: "ติดต่อได้อย่างไร?", fr: "Comment vous contacter ?" },
    a: contact },
];

export const SUGGESTED = ["price", "scan", "privacy", "contact"];
export const entryQuestion = (id: string, lang: Lang) => ENTRIES.find((e) => e.id === id)!.q[lang];
export const entryAnswer = (id: string, lang: Lang) => ENTRIES.find((e) => e.id === id)!.a[lang];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Best matching answer id, or null when nothing matches well enough. */
export function bestMatch(input: string): string | null {
  const text = norm(input);
  if (text.trim().length < 2) return null;
  let best: { id: string; score: number } | null = null;
  for (const e of ENTRIES) {
    let score = 0;
    for (const k of e.keywords) if (text.includes(norm(k))) score += Math.min(norm(k).length, 8);
    if (score > 0 && (!best || score > best.score)) best = { id: e.id, score };
  }
  return best && best.score >= 3 ? best.id : null;
}

export const FALLBACK: Text = {
  en: "I don't have an answer for that. Try one of these, or see the FAQ page.",
  th: "ฉันยังไม่มีคำตอบสำหรับเรื่องนี้ ลองหัวข้อด้านล่าง หรือดูหน้าคำถามที่พบบ่อย",
  fr: "Je n'ai pas de réponse à cela. Essayez l'un de ces sujets, ou consultez la FAQ.",
};
