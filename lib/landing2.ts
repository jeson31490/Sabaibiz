// Words of the public home page in English, Thai, French and Russian. Keep the four in step.
import type { Lang } from "./landingCopy";

export type L2 = {
  htmlLang: string;
  meta: { title: string; description: string };
  nav: { how: string; pricing: string; security: string; signIn: string; start: string };
  announce: string;
  hero: { eyebrow: string; lines: [string, string, string]; sub: string; cta: string; cta2: string; note: string };
  hub: { invoice: string; till: string; grab: string; line: string; today: string; alert: string; margin: string; archive: string; alertV: string; marginV: string };
  suite: { title: string; intro: string; live: string; soon: string; items: { t: string; d: string; soon?: boolean }[] };
  tabs: { label: string; title: string; text: string; badge?: string; bullets: string[] }[];
  why: { title: string; items: { t: string; d: string }[] };
  byo: { badge: string; title: string; text: string; steps: string[]; card: string; cardNote: string };
  connector: { badge: string; title: string; text: string; ask: string; answer: string; works: string; logos: string[] };
  pricing: { title: string; intro: string; monthly: string; yearly: string; save: string; perMonth: string; popular: string; soon: string; newTag: string; cta: string; pay: string; yearlyNote: string };
  security: { title: string; items: { n: string; t: string; d: string }[] };
  final: { title: string; text: string; cta: string };
  footer: { rights: string; faq: string; privacy: string; terms: string };
  langs: string;
};

const en: L2 = {
  htmlLang: "en",
  meta: {
    title: "SabaiBiz: easy accounting for small business in Thailand",
    description: "Photograph invoices, connect your till, see one clear number for the day. Simple accounting for any small business in Thailand. Free to start.",
  },
  nav: { how: "What it does", pricing: "Pricing", security: "Security", signIn: "Sign in", start: "Start free" },
  announce: "Built in a Samui kitchen · Tested on real Makro invoices",
  hero: {
    eyebrow: "EASY ACCOUNTING FOR SMALL BUSINESS",
    lines: ["Snap the invoice.", "Know your day.", "Keep your margin."],
    sub: "SabaiBiz reads your supplier invoices, adds your till sales and shows one clear number for the day. For any shop, café or small business in Thailand.",
    cta: "Start free",
    cta2: "See how it works",
    note: "No card needed. Free forever with your own AI key.",
  },
  hub: { invoice: "Invoice photo", till: "Loyverse POS", grab: "Orders|Grab, Lazada…", line: "LINE · Ocha", today: "TODAY", alert: "Price alerts", margin: "Margin per product", archive: "Archive · CSV", alertV: "Olive oil ▲ 9%", marginV: "Linen shirt 68%" },
  suite: {
    title: "All in one, in your pocket",
    intro: "Everything that touches your money, in one place you can open from your phone.",
    live: "LIVE",
    soon: "SOON",
    items: [
      { t: "Invoices", d: "Photo in, products, quantities and prices out. Every invoice kept with its picture." },
      { t: "Price tracking", d: "See when a supplier raises a price, and by how much." },
      { t: "Margin per product", d: "Real margin from the purchase price read on your invoices." },
      { t: "Daily takings", d: "Your till sales from Loyverse next to what you spent." },
      { t: "Team & attendance", d: "Check arrival times and absences, and keep a full history." },
      { t: "Payroll", d: "Thai social security and income tax calculated, payslips ready to print or share." },
    ],
  },
  tabs: [
    { label: "Invoices", title: "One photo, no typing", text: "Take the picture at the delivery door. Sabai fills in the supplier, products, quantities and prices. You check, you save.", bullets: ["Thai and English invoices", "Up to 4 pages per invoice", "Duplicate invoices flagged"] },
    { label: "Prices", title: "Catch every price rise", text: "Each product keeps its price history, so a supplier can't quietly raise it.", bullets: ["Price history per product", "Alert when it jumps", "Compare suppliers"] },
    { label: "Margins", title: "Know what you really keep", text: "Margin per product, based on the purchase price Sabai reads by itself. Restaurant, shop, salon: any business that sells something.", badge: "TRACKER PLAN", bullets: ["Recipes and bundles", "Margin updates with the price", "Works for any product"] },
    { label: "Team", title: "Your staff clock in, you stay in charge", text: "Invite your people by e-mail. They clock in, see their days off. Remove access in one tap, history is kept.", bullets: ["Employees are free", "Managers on Team and Tracker", "You decide who sees invoices"] },
  ],
  why: {
    title: "Why SabaiBiz",
    items: [
      { t: "A photo is all it takes", d: "No typing. Snap the invoice at the door and the lines fill themselves." },
      { t: "Prices never surprise you", d: "Every product keeps its price history, with an alert when a supplier raises it." },
      { t: "Your real margin, per product", d: "Margins follow the purchase prices read from your invoices, not a guess." },
      { t: "Made for the owner, not the accountant", d: "Plain words and big numbers. No accounting course needed." },
      { t: "Your team, under control", d: "Attendance, absences and payslips in one place. Employees are free." },
      { t: "Yours to keep", d: "Export everything to CSV. No ads, and your data is never sold." },
    ],
  },
  byo: {
    badge: "FREE PLAN",
    title: "Bring your own AI, pay nothing to Sabai",
    text: "Paste your own Anthropic key and read as many invoices as you want, on any plan. You pay the AI provider directly, about 1–2 ฿ per invoice.",
    steps: ["Create an Anthropic account", "Copy your API key", "Paste it in Sabai. Done"],
    card: "AI key connected",
    cardNote: "Unlimited scans",
  },
  connector: {
    badge: "COMING SOON",
    title: "Your accounting is an AI you can talk to",
    text: "Ask in plain words and get a quick answer. Soon, straight from the AI assistant you already use.",
    ask: "How much did I spend on milk this month?",
    answer: "4,860 ฿ across 6 invoices. Price up 6% since September.",
    works: "Works with",
    logos: ["Claude", "ChatGPT", "Gemini"],
  },
  pricing: {
    title: "Simple prices, in baht",
    intro: "Start free. Pay only when you want more. Employees are always free.",
    monthly: "Monthly",
    yearly: "Yearly",
    save: "-20%",
    perMonth: "/month",
    popular: "MOST POPULAR",
    soon: "SOON",
    newTag: "NEW",
    cta: "Start free",
    pay: "Pay with",
    yearlyNote: "billed yearly",
  },
  security: {
    title: "Your numbers stay yours",
    items: [
      { n: "3", t: "Roles", d: "Owner, manager, employee. Each sees only what you allow." },
      { n: "0", t: "Data resale", d: "No ads and your data is never sold." },
      { n: "CSV", t: "Export anytime", d: "Take all your invoices with you in a spreadsheet whenever you like." },
    ],
  },
  final: { title: "Your accounting, finally simple.", text: "Free to start. Your first invoice takes less than a minute.", cta: "Start free" },
  footer: { rights: "All rights reserved.", faq: "FAQ", privacy: "Privacy", terms: "Terms" },
  langs: "Language",
};

const th: L2 = {
  htmlLang: "th",
  meta: {
    title: "SabaiBiz: บัญชีง่ายๆ สำหรับธุรกิจขนาดเล็กในไทย",
    description: "ถ่ายรูปใบแจ้งหนี้ เชื่อมระบบขาย แล้วเห็นตัวเลขของวันเดียวชัดๆ บัญชีง่ายๆ สำหรับทุกธุรกิจเล็กในไทย เริ่มฟรี",
  },
  nav: { how: "ทำอะไรได้บ้าง", pricing: "ราคา", security: "ความปลอดภัย", signIn: "เข้าสู่ระบบ", start: "เริ่มฟรี" },
  announce: "สร้างในครัวที่เกาะสมุย · ทดสอบกับใบแจ้งหนี้แม็คโครจริง",
  hero: {
    eyebrow: "บัญชีง่ายๆ สำหรับธุรกิจขนาดเล็ก",
    lines: ["ถ่ายรูปใบแจ้งหนี้", "รู้ยอดของวัน", "รักษากำไรไว้"],
    sub: "SabaiBiz อ่านใบแจ้งหนี้ซัพพลายเออร์ รวมยอดขายจากเครื่องขาย และแสดงตัวเลขเดียวที่ชัดเจนของวัน สำหรับร้านค้า คาเฟ่ หรือธุรกิจเล็กทุกประเภทในไทย",
    cta: "เริ่มฟรี",
    cta2: "ดูวิธีใช้งาน",
    note: "ไม่ต้องใช้บัตร ใช้ฟรีตลอดด้วยคีย์ AI ของคุณเอง",
  },
  hub: { invoice: "รูปใบแจ้งหนี้", till: "Loyverse POS", grab: "ออเดอร์|Grab, Lazada…", line: "LINE · Ocha", today: "วันนี้", alert: "แจ้งเตือนราคา", margin: "กำไรต่อสินค้า", archive: "คลัง · CSV", alertV: "น้ำมันมะกอก ▲ 9%", marginV: "เสื้อลินิน 68%" },
  suite: {
    title: "ครบในที่เดียว ในกระเป๋าคุณ",
    intro: "ทุกอย่างที่เกี่ยวกับเงินของคุณ อยู่ในที่เดียวและเปิดดูจากมือถือได้",
    live: "ใช้ได้แล้ว",
    soon: "เร็วๆ นี้",
    items: [
      { t: "ใบแจ้งหนี้", d: "ถ่ายรูป ได้สินค้า จำนวน ราคา เก็บทุกใบพร้อมรูป" },
      { t: "ติดตามราคา", d: "เห็นเมื่อซัพพลายเออร์ขึ้นราคา และขึ้นเท่าไร" },
      { t: "กำไรต่อสินค้า", d: "กำไรจริงจากราคาซื้อที่อ่านจากใบแจ้งหนี้" },
      { t: "ยอดขายรายวัน", d: "ยอดขายจาก Loyverse เทียบกับที่จ่ายไป" },
      { t: "ทีมและเวลาเข้างาน", d: "ตรวจเวลาเข้างานและการขาดงาน พร้อมเก็บประวัติครบ" },
      { t: "สลิปเงินเดือน", d: "คำนวณประกันสังคมและภาษีเงินได้ พร้อมสลิปสำหรับพิมพ์หรือแชร์" },
    ],
  },
  tabs: [
    { label: "ใบแจ้งหนี้", title: "ถ่ายรูปเดียว ไม่ต้องพิมพ์", text: "ถ่ายรูปตอนรับของ Sabai กรอกซัพพลายเออร์ สินค้า จำนวน และราคาให้ คุณตรวจแล้วบันทึก", bullets: ["ใบแจ้งหนี้ภาษาไทยและอังกฤษ", "สูงสุด 4 หน้าต่อใบ", "เตือนใบซ้ำ"] },
    { label: "ราคา", title: "จับทุกการขึ้นราคา", text: "สินค้าแต่ละอย่างเก็บประวัติราคา ซัพพลายเออร์จะขึ้นราคาเงียบๆ ไม่ได้", bullets: ["ประวัติราคาต่อสินค้า", "แจ้งเตือนเมื่อราคากระโดด", "เปรียบเทียบซัพพลายเออร์"] },
    { label: "กำไร", title: "รู้ว่าเหลือกำไรจริงเท่าไร", text: "กำไรต่อสินค้าจากราคาซื้อที่ Sabai อ่านเอง ไม่ว่าจะร้านอาหาร ร้านค้า หรือร้านเสริมสวย", badge: "แพ็กเกจ TRACKER", bullets: ["สูตรและเซ็ตสินค้า", "กำไรอัปเดตตามราคา", "ใช้ได้กับสินค้าทุกชนิด"] },
    { label: "ทีม", title: "พนักงานลงเวลา คุณคุมได้", text: "เชิญทีมทางอีเมล พวกเขาลงเวลาและดูวันลาได้ ยกเลิกสิทธิ์ได้ในแตะเดียว ประวัติยังอยู่", bullets: ["พนักงานใช้ฟรี", "ผู้จัดการในแพ็กเกจ Team และ Tracker", "คุณเลือกว่าใครเห็นใบแจ้งหนี้"] },
  ],
  why: {
    title: "ทำไมต้อง SabaiBiz",
    items: [
      { t: "แค่ถ่ายรูปก็พอ", d: "ไม่ต้องพิมพ์ ถ่ายใบแจ้งหนี้ที่หน้าร้าน รายการจะกรอกให้เอง" },
      { t: "ราคาไม่เซอร์ไพรส์คุณอีก", d: "สินค้าทุกชิ้นเก็บประวัติราคา และแจ้งเตือนเมื่อซัพพลายเออร์ขึ้นราคา" },
      { t: "กำไรจริงต่อสินค้า", d: "กำไรคำนวณจากราคาซื้อที่อ่านจากใบแจ้งหนี้ ไม่ใช่การเดา" },
      { t: "ทำมาเพื่อเจ้าของ ไม่ใช่นักบัญชี", d: "ภาษาง่ายๆ ตัวเลขใหญ่ๆ ไม่ต้องเรียนบัญชี" },
      { t: "ทีมของคุณอยู่ในการควบคุม", d: "เวลาเข้างาน การขาดงาน และสลิปเงินเดือนในที่เดียว พนักงานใช้ฟรี" },
      { t: "เป็นของคุณเสมอ", d: "ส่งออกทุกอย่างเป็น CSV ไม่มีโฆษณา และไม่ขายข้อมูลของคุณ" },
    ],
  },
  byo: {
    badge: "แพ็กเกจฟรี",
    title: "ใช้ AI ของคุณเอง ไม่ต้องจ่ายให้ Sabai",
    text: "วางคีย์ Anthropic ของคุณ แล้วอ่านใบแจ้งหนี้ได้ไม่จำกัดทุกแพ็กเกจ จ่ายตรงให้ผู้ให้บริการ AI ประมาณ 1–2 บาทต่อใบ",
    steps: ["สร้างบัญชี Anthropic", "คัดลอก API key", "วางใน Sabai เสร็จ"],
    card: "เชื่อมคีย์ AI แล้ว",
    cardNote: "สแกนไม่จำกัด",
  },
  connector: {
    badge: "เร็วๆ นี้",
    title: "บัญชีของคุณคือ AI ที่คุยด้วยได้",
    text: "ถามด้วยภาษาง่ายๆ แล้วได้คำตอบเร็ว เร็วๆ นี้ผ่านผู้ช่วย AI ที่คุณใช้อยู่แล้ว",
    ask: "เดือนนี้ซื้อนมไปเท่าไร",
    answer: "4,860 บาท จาก 6 ใบ ราคาขึ้น 6% จากเดือนกันยายน",
    works: "ใช้งานร่วมกับ",
    logos: ["Claude", "ChatGPT", "Gemini"],
  },
  pricing: {
    title: "ราคาง่ายๆ เป็นบาท",
    intro: "เริ่มฟรี จ่ายเมื่อต้องการมากขึ้น พนักงานใช้ฟรีเสมอ",
    monthly: "รายเดือน",
    yearly: "รายปี",
    save: "-20%",
    perMonth: "/เดือน",
    popular: "ยอดนิยม",
    soon: "เร็วๆ นี้",
    newTag: "ใหม่",
    cta: "เริ่มฟรี",
    pay: "จ่ายด้วย",
    yearlyNote: "เรียกเก็บรายปี",
  },
  security: {
    title: "ตัวเลขของคุณเป็นของคุณ",
    items: [
      { n: "3", t: "บทบาท", d: "เจ้าของ ผู้จัดการ พนักงาน แต่ละคนเห็นเท่าที่คุณอนุญาต" },
      { n: "0", t: "ขายข้อมูล", d: "ไม่มีโฆษณา และไม่ขายข้อมูลของคุณ" },
      { n: "CSV", t: "ส่งออกได้ทุกเมื่อ", d: "นำใบแจ้งหนี้ทั้งหมดไปเป็นสเปรดชีตได้ทุกเมื่อที่ต้องการ" },
    ],
  },
  final: { title: "บัญชีของคุณ ง่ายขึ้นเสียที", text: "เริ่มฟรี ใบแรกใช้เวลาไม่ถึงนาที", cta: "เริ่มฟรี" },
  footer: { rights: "สงวนลิขสิทธิ์", faq: "คำถามที่พบบ่อย", privacy: "ความเป็นส่วนตัว", terms: "ข้อกำหนด" },
  langs: "ภาษา",
};

const fr: L2 = {
  htmlLang: "fr",
  meta: {
    title: "SabaiBiz : la compta facile pour les petits commerces en Thaïlande",
    description: "Photographiez vos factures, connectez votre caisse, voyez un seul chiffre clair pour la journée. Gratuit pour commencer.",
  },
  nav: { how: "Ce que ça fait", pricing: "Tarifs", security: "Sécurité", signIn: "Connexion", start: "Commencer gratuitement" },
  announce: "Conçu dans une cuisine de Samui · Testé sur de vraies factures Makro",
  hero: {
    eyebrow: "LA COMPTA FACILE POUR PETITS COMMERCES",
    lines: ["Photographiez la facture.", "Connaissez votre journée.", "Gardez votre marge."],
    sub: "SabaiBiz lit vos factures fournisseurs, ajoute les ventes de votre caisse et affiche un seul chiffre clair pour la journée. Pour toute boutique, tout café ou petite entreprise en Thaïlande.",
    cta: "Commencer gratuitement",
    cta2: "Voir comment ça marche",
    note: "Sans carte. Gratuit à vie avec votre propre clé IA.",
  },
  hub: { invoice: "Photo de facture", till: "Loyverse POS", grab: "Commandes|Grab, Lazada…", line: "LINE · Ocha", today: "AUJOURD'HUI", alert: "Alertes de prix", margin: "Marge par produit", archive: "Archive · CSV", alertV: "Huile d'olive ▲ 9 %", marginV: "Chemise en lin 68 %" },
  suite: {
    title: "Tout-en-un, dans votre poche",
    intro: "Tout ce qui touche à votre argent, au même endroit, depuis votre téléphone.",
    live: "ACTIF",
    soon: "BIENTÔT",
    items: [
      { t: "Factures", d: "Photo en entrée, produits, quantités et prix en sortie. Chaque facture gardée avec son image." },
      { t: "Suivi des prix", d: "Voyez quand un fournisseur augmente un prix, et de combien." },
      { t: "Marge par produit", d: "Marge réelle d'après le prix d'achat lu sur vos factures." },
      { t: "Recette du jour", d: "Les ventes de votre caisse Loyverse à côté de vos dépenses." },
      { t: "Équipe et présence", d: "Contrôlez les heures d'arrivée et les absences, avec un historique complet." },
      { t: "Fiche de paie", d: "Sécurité sociale et impôt thaïlandais calculés, fiches de paie prêtes à imprimer ou partager." },
    ],
  },
  tabs: [
    { label: "Factures", title: "Une photo, zéro saisie", text: "Prenez la photo à la livraison. Sabai remplit fournisseur, produits, quantités et prix. Vous vérifiez, vous enregistrez.", bullets: ["Factures thaï et anglais", "Jusqu'à 4 pages par facture", "Doublons signalés"] },
    { label: "Prix", title: "Repérez chaque hausse", text: "Chaque produit garde son historique de prix : un fournisseur ne peut plus augmenter en douce.", bullets: ["Historique par produit", "Alerte en cas de saut", "Comparaison des fournisseurs"] },
    { label: "Marges", title: "Sachez ce qu'il vous reste vraiment", text: "Marge par produit, d'après le prix d'achat que Sabai lit tout seul. Resto, boutique, salon : tout commerce qui vend quelque chose.", badge: "FORFAIT TRACKER", bullets: ["Recettes et lots", "La marge suit le prix", "Pour tout type de produit"] },
    { label: "Équipe", title: "Vos employés pointent, vous gardez la main", text: "Invitez-les par e-mail. Ils pointent et voient leurs jours d'absence. Retirez l'accès d'un geste, l'historique reste.", bullets: ["Employés gratuits", "Managers dans Team et Tracker", "Vous choisissez qui voit les factures"] },
  ],
  why: {
    title: "Pourquoi SabaiBiz",
    items: [
      { t: "Une photo suffit", d: "Zéro saisie. Photographiez la facture à la livraison, les lignes se remplissent seules." },
      { t: "Les prix ne vous surprennent plus", d: "Chaque produit garde son historique de prix, avec une alerte quand un fournisseur augmente." },
      { t: "Votre vraie marge, par produit", d: "La marge suit les prix d'achat lus sur vos factures, pas une estimation." },
      { t: "Pensé pour le patron, pas le comptable", d: "Des mots simples et de gros chiffres. Aucune formation comptable." },
      { t: "Votre équipe sous contrôle", d: "Présence, absences et fiches de paie au même endroit. Employés gratuits." },
      { t: "Vos données restent à vous", d: "Exportez tout en CSV. Pas de pub, et vos données ne sont jamais vendues." },
    ],
  },
  byo: {
    badge: "FORFAIT GRATUIT",
    title: "Apportez votre IA, ne payez rien à Sabai",
    text: "Collez votre clé Anthropic et lisez autant de factures que vous voulez, sur tous les forfaits. Vous payez directement le fournisseur d'IA, environ 1 à 2 ฿ par facture.",
    steps: ["Créez un compte Anthropic", "Copiez votre clé API", "Collez-la dans Sabai. C'est fait"],
    card: "Clé IA connectée",
    cardNote: "Scans illimités",
  },
  connector: {
    badge: "BIENTÔT",
    title: "Votre compta est une IA à qui vous pouvez parler",
    text: "Posez vos questions avec des mots simples, obtenez une réponse rapide. Bientôt, directement depuis l'assistant IA que vous utilisez déjà.",
    ask: "Combien j'ai dépensé en lait ce mois-ci ?",
    answer: "4 860 ฿ sur 6 factures. Prix en hausse de 6 % depuis septembre.",
    works: "Compatible avec",
    logos: ["Claude", "ChatGPT", "Gemini"],
  },
  pricing: {
    title: "Des prix simples, en bahts",
    intro: "Commencez gratuitement. Payez seulement quand il vous en faut plus. Les employés sont toujours gratuits.",
    monthly: "Mensuel",
    yearly: "Annuel",
    save: "-20 %",
    perMonth: "/mois",
    popular: "LE PLUS POPULAIRE",
    soon: "BIENTÔT",
    newTag: "NOUVEAU",
    cta: "Commencer gratuitement",
    pay: "Payer avec",
    yearlyNote: "facturé à l'année",
  },
  security: {
    title: "Vos chiffres restent à vous",
    items: [
      { n: "3", t: "Rôles", d: "Propriétaire, manager, employé. Chacun ne voit que ce que vous autorisez." },
      { n: "0", t: "Revente de données", d: "Pas de pub, et vos données ne sont jamais vendues." },
      { n: "CSV", t: "Export à tout moment", d: "Repartez avec toutes vos factures dans un tableur quand vous le souhaitez." },
    ],
  },
  final: { title: "Votre compta, enfin simple.", text: "Gratuit pour commencer. Votre première facture prend moins d'une minute.", cta: "Commencer gratuitement" },
  footer: { rights: "Tous droits réservés.", faq: "FAQ", privacy: "Confidentialité", terms: "Conditions" },
  langs: "Langue",
};

const ru: L2 = {
  htmlLang: "ru",
  meta: {
    title: "SabaiBiz: простая бухгалтерия для малого бизнеса в Таиланде",
    description: "Сфотографируйте счета, подключите кассу и увидьте одну понятную цифру за день. Бесплатно для старта.",
  },
  nav: { how: "Что умеет", pricing: "Тарифы", security: "Безопасность", signIn: "Войти", start: "Начать бесплатно" },
  announce: "Создано на кухне на Самуи · Проверено на настоящих счетах Makro",
  hero: {
    eyebrow: "ПРОСТАЯ БУХГАЛТЕРИЯ ДЛЯ МАЛОГО БИЗНЕСА",
    lines: ["Сфотографируйте счёт.", "Узнайте свой день.", "Сохраните маржу."],
    sub: "SabaiBiz читает счета поставщиков, добавляет продажи с кассы и показывает одну понятную цифру за день. Для любого магазина, кафе или малого бизнеса в Таиланде.",
    cta: "Начать бесплатно",
    cta2: "Как это работает",
    note: "Без карты. Бесплатно навсегда с вашим ИИ-ключом.",
  },
  hub: { invoice: "Фото счёта", till: "Loyverse POS", grab: "Заказы|Grab, Lazada…", line: "LINE · Ocha", today: "СЕГОДНЯ", alert: "Оповещения о ценах", margin: "Маржа по товару", archive: "Архив · CSV", alertV: "Оливк. масло ▲ 9%", marginV: "Льняная рубашка 68%" },
  suite: {
    title: "Всё в одном, у вас в кармане",
    intro: "Всё, что касается ваших денег, в одном месте и с телефона.",
    live: "РАБОТАЕТ",
    soon: "СКОРО",
    items: [
      { t: "Счета", d: "Фото на входе, товары, количества и цены на выходе. Каждый счёт хранится с картинкой." },
      { t: "Отслеживание цен", d: "Видно, когда поставщик поднял цену и на сколько." },
      { t: "Маржа по товару", d: "Реальная маржа по закупочной цене, прочитанной из счетов." },
      { t: "Дневная выручка", d: "Продажи с кассы Loyverse рядом с вашими расходами." },
      { t: "Команда и учёт времени", d: "Контроль времени прихода и отсутствий, с полной историей." },
      { t: "Расчётные листки", d: "Тайские соцвзносы и подоходный налог посчитаны, листки готовы к печати." },
    ],
  },
  tabs: [
    { label: "Счета", title: "Одно фото, ноль ввода", text: "Сфотографируйте при приёмке. Sabai заполнит поставщика, товары, количества и цены. Вы проверяете и сохраняете.", bullets: ["Счета на тайском и английском", "До 4 страниц в счёте", "Дубликаты помечаются"] },
    { label: "Цены", title: "Ловите каждый рост цены", text: "У каждого товара своя история цен, поставщик не поднимет цену незаметно.", bullets: ["История цен по товару", "Оповещение о скачке", "Сравнение поставщиков"] },
    { label: "Маржа", title: "Знайте, сколько остаётся на самом деле", text: "Маржа по товару на основе закупочной цены, которую Sabai читает сам. Ресторан, магазин, салон: любой бизнес, который что-то продаёт.", badge: "ТАРИФ TRACKER", bullets: ["Рецепты и наборы", "Маржа следует за ценой", "Для любого товара"] },
    { label: "Команда", title: "Сотрудники отмечаются, вы управляете", text: "Пригласите людей по e-mail. Они отмечаются и видят свои выходные. Доступ убирается одним нажатием, история остаётся.", bullets: ["Сотрудники бесплатно", "Менеджеры в Team и Tracker", "Вы решаете, кто видит счета"] },
  ],
  why: {
    title: "Почему SabaiBiz",
    items: [
      { t: "Достаточно одного фото", d: "Без ввода. Сфотографируйте счёт при приёмке, строки заполнятся сами." },
      { t: "Цены больше не удивляют", d: "У каждого товара своя история цен и оповещение, когда поставщик её поднимает." },
      { t: "Ваша реальная маржа по товару", d: "Маржа строится на закупочных ценах из ваших счетов, а не на догадках." },
      { t: "Сделано для владельца, не для бухгалтера", d: "Простые слова и крупные цифры. Курсы бухгалтерии не нужны." },
      { t: "Команда под контролем", d: "Учёт времени, отсутствия и расчётные листки в одном месте. Сотрудники бесплатно." },
      { t: "Ваши данные остаются вашими", d: "Экспорт всего в CSV. Без рекламы, данные не продаются." },
    ],
  },
  byo: {
    badge: "БЕСПЛАТНЫЙ ТАРИФ",
    title: "Свой ИИ — и ничего не платите Sabai",
    text: "Вставьте свой ключ Anthropic и читайте сколько угодно счетов на любом тарифе. Вы платите провайдеру ИИ напрямую, примерно 1–2 ฿ за счёт.",
    steps: ["Создайте аккаунт Anthropic", "Скопируйте API-ключ", "Вставьте в Sabai. Готово"],
    card: "ИИ-ключ подключён",
    cardNote: "Сканы без лимита",
  },
  connector: {
    badge: "СКОРО",
    title: "Ваша бухгалтерия — это ИИ, с которым можно говорить",
    text: "Спрашивайте простыми словами и получайте быстрые ответы. Скоро — прямо из ИИ-помощника, которым вы уже пользуетесь.",
    ask: "Сколько я потратил на молоко в этом месяце?",
    answer: "4 860 ฿ по 6 счетам. Цена выросла на 6% с сентября.",
    works: "Работает с",
    logos: ["Claude", "ChatGPT", "Gemini"],
  },
  pricing: {
    title: "Простые цены в батах",
    intro: "Начните бесплатно. Платите, только когда нужно больше. Сотрудники всегда бесплатно.",
    monthly: "Помесячно",
    yearly: "На год",
    save: "-20%",
    perMonth: "/мес",
    popular: "ПОПУЛЯРНЫЙ",
    soon: "СКОРО",
    newTag: "НОВОЕ",
    cta: "Начать бесплатно",
    pay: "Оплата",
    yearlyNote: "оплата за год",
  },
  security: {
    title: "Ваши цифры остаются вашими",
    items: [
      { n: "3", t: "Роли", d: "Владелец, менеджер, сотрудник. Каждый видит только разрешённое." },
      { n: "0", t: "Продажи данных", d: "Без рекламы, данные не продаются." },
      { n: "CSV", t: "Экспорт в любой момент", d: "Заберите все счета в таблице, когда захотите." },
    ],
  },
  final: { title: "Ваша бухгалтерия — наконец-то простая.", text: "Бесплатно для старта. Первый счёт — меньше минуты.", cta: "Начать бесплатно" },
  footer: { rights: "Все права защищены.", faq: "FAQ", privacy: "Конфиденциальность", terms: "Условия" },
  langs: "Язык",
};

export const L2_COPY: Record<Lang, L2> = { en, th, fr, ru };
export const LANG_PATH: Record<Lang, string> = { en: "/", th: "/th", fr: "/fr", ru: "/ru" };
export const LANG_LABEL: Record<Lang, string> = { en: "EN", th: "ไทย", fr: "FR", ru: "RU" };
