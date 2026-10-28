// Words of the public home page in English, Thai, French and Russian. Keep the four in step.
import type { Lang } from "./landingCopy";

export type L2 = {
  htmlLang: string;
  meta: { title: string; description: string };
  nav: { how: string; pricing: string; security: string; signIn: string; start: string };
  announce: string;
  hero: { eyebrow: string; lines: [string, string, string]; sub: string; cta: string; cta2: string; note: string };
  hub: { invoice: string; till: string; grab: string; line: string; today: string; alert: string; margin: string; archive: string; alertV: string; marginV: string };
  stats: { n: string; l: string }[];
  suite: { title: string; intro: string; live: string; soon: string; items: { t: string; d: string; soon?: boolean }[] };
  tabs: { label: string; title: string; text: string; badge?: string; bullets: string[] }[];
  why: { title: string; no: string[]; yes: string[] };
  byo: { badge: string; title: string; text: string; steps: string[]; card: string; cardNote: string };
  connector: { badge: string; title: string; text: string; ask: string; answer: string };
  pricing: { title: string; intro: string; monthly: string; yearly: string; save: string; perMonth: string; popular: string; soon: string; newTag: string; cta: string; pay: string; yearlyNote: string };
  security: { title: string; items: { n: string; t: string; d: string }[] };
  final: { title: string; text: string; cta: string };
  footer: { rights: string; faq: string; privacy: string; terms: string };
  langs: string;
};

const en: L2 = {
  htmlLang: "en",
  meta: {
    title: "Sabai: easy accounting for small business in Thailand",
    description: "Photograph invoices, connect your till, see one clear number for the day. Simple accounting for any small business in Thailand. Free to start.",
  },
  nav: { how: "What it does", pricing: "Pricing", security: "Security", signIn: "Sign in", start: "Start free" },
  announce: "Built in a Samui kitchen · Tested on real Makro invoices",
  hero: {
    eyebrow: "EASY ACCOUNTING FOR SMALL BUSINESS",
    lines: ["Snap the invoice.", "Know your day.", "Keep your margin."],
    sub: "Sabai reads your supplier invoices, adds your till sales and shows one clear number for the day. For any shop, café or small business in Thailand.",
    cta: "Start free",
    cta2: "See how it works",
    note: "No card needed. Free forever with your own AI key.",
  },
  hub: { invoice: "Invoice photo", till: "Loyverse till", grab: "Grab orders", line: "LINE · Ocha", today: "TODAY", alert: "Price alerts", margin: "Margin per product", archive: "Archive · CSV", alertV: "Eggs ▲ 9%", marginV: "Iced latte 68%" },
  stats: [
    { n: "12/12", l: "prices read right on a real Makro invoice" },
    { n: "27 s", l: "from photo to checked lines" },
    { n: "0", l: "bank connections needed" },
    { n: "฿0", l: "to start with your own AI key" },
  ],
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
      { t: "Team & clock-in", d: "Invite staff to clock in. Free for them, you stay in control." },
      { t: "Payroll sheet", d: "Thai social security and tax worked out for you, as information.", soon: true },
    ],
  },
  tabs: [
    { label: "Invoices", title: "One photo, no typing", text: "Take the picture at the delivery door. Sabai fills in the supplier, products, quantities and prices. You check, you save.", bullets: ["Thai and English invoices", "Up to 4 pages per invoice", "Duplicate invoices flagged"] },
    { label: "Prices", title: "Catch every price rise", text: "Each product keeps its price history, so a supplier can't quietly raise it.", bullets: ["Price history per product", "Alert when it jumps", "Compare suppliers"] },
    { label: "Margins", title: "Know what you really keep", text: "Margin per product, based on the purchase price Sabai reads by itself. Restaurant, shop, salon: any business that sells something.", badge: "TRACKER PLAN", bullets: ["Recipes and bundles", "Margin updates with the price", "Works for any product"] },
    { label: "Team", title: "Your staff clock in, you stay in charge", text: "Invite your people by e-mail. They clock in, see their days off. Remove access in one tap, history is kept.", bullets: ["Employees are free", "Managers on Team and Tracker", "You decide who sees invoices"] },
  ],
  why: {
    title: "Why Sabai",
    no: ["Piles of paper invoices", "Prices you find out about too late", "Software made for accountants", "Hours of typing each month"],
    yes: ["A photo is enough", "An alert when a price moves", "Made for the owner, not the accountant", "Your day in one number"],
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
    title: "Ask your accounting, in plain words",
    text: "Soon you will be able to ask Sabai from your AI assistant, in your own language.",
    ask: "How much did I spend on milk this month?",
    answer: "4,860 ฿ across 6 invoices. Price up 6% since September.",
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
      { n: "1", t: "Tap to remove", d: "Take away anyone's access instantly. History is kept." },
    ],
  },
  final: { title: "Stop guessing. Know your day.", text: "Free to start. Your first invoice takes less than a minute.", cta: "Start free" },
  footer: { rights: "All rights reserved.", faq: "FAQ", privacy: "Privacy", terms: "Terms" },
  langs: "Language",
};

const th: L2 = {
  htmlLang: "th",
  meta: {
    title: "Sabai: บัญชีง่ายๆ สำหรับธุรกิจขนาดเล็กในไทย",
    description: "ถ่ายรูปใบแจ้งหนี้ เชื่อมระบบขาย แล้วเห็นตัวเลขของวันเดียวชัดๆ บัญชีง่ายๆ สำหรับทุกธุรกิจเล็กในไทย เริ่มฟรี",
  },
  nav: { how: "ทำอะไรได้บ้าง", pricing: "ราคา", security: "ความปลอดภัย", signIn: "เข้าสู่ระบบ", start: "เริ่มฟรี" },
  announce: "สร้างในครัวที่เกาะสมุย · ทดสอบกับใบแจ้งหนี้แม็คโครจริง",
  hero: {
    eyebrow: "บัญชีง่ายๆ สำหรับธุรกิจขนาดเล็ก",
    lines: ["ถ่ายรูปใบแจ้งหนี้", "รู้ยอดของวัน", "รักษากำไรไว้"],
    sub: "Sabai อ่านใบแจ้งหนี้ซัพพลายเออร์ รวมยอดขายจากเครื่องขาย และแสดงตัวเลขเดียวที่ชัดเจนของวัน สำหรับร้านค้า คาเฟ่ หรือธุรกิจเล็กทุกประเภทในไทย",
    cta: "เริ่มฟรี",
    cta2: "ดูวิธีใช้งาน",
    note: "ไม่ต้องใช้บัตร ใช้ฟรีตลอดด้วยคีย์ AI ของคุณเอง",
  },
  hub: { invoice: "รูปใบแจ้งหนี้", till: "เครื่องขาย Loyverse", grab: "ออเดอร์ Grab", line: "LINE · Ocha", today: "วันนี้", alert: "แจ้งเตือนราคา", margin: "กำไรต่อสินค้า", archive: "คลัง · CSV", alertV: "ไข่ ▲ 9%", marginV: "ลาเต้เย็น 68%" },
  stats: [
    { n: "12/12", l: "ราคาถูกต้องจากใบแจ้งหนี้แม็คโครจริง" },
    { n: "27 วิ", l: "จากรูปถึงรายการพร้อมตรวจ" },
    { n: "0", l: "ไม่ต้องเชื่อมบัญชีธนาคาร" },
    { n: "฿0", l: "เริ่มต้นด้วยคีย์ AI ของคุณเอง" },
  ],
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
      { t: "ทีมและลงเวลา", d: "เชิญพนักงานลงเวลา ฟรีสำหรับพวกเขา คุณควบคุมได้" },
      { t: "สลิปเงินเดือน", d: "คำนวณประกันสังคมและภาษีให้ เพื่อเป็นข้อมูล", soon: true },
    ],
  },
  tabs: [
    { label: "ใบแจ้งหนี้", title: "ถ่ายรูปเดียว ไม่ต้องพิมพ์", text: "ถ่ายรูปตอนรับของ Sabai กรอกซัพพลายเออร์ สินค้า จำนวน และราคาให้ คุณตรวจแล้วบันทึก", bullets: ["ใบแจ้งหนี้ภาษาไทยและอังกฤษ", "สูงสุด 4 หน้าต่อใบ", "เตือนใบซ้ำ"] },
    { label: "ราคา", title: "จับทุกการขึ้นราคา", text: "สินค้าแต่ละอย่างเก็บประวัติราคา ซัพพลายเออร์จะขึ้นราคาเงียบๆ ไม่ได้", bullets: ["ประวัติราคาต่อสินค้า", "แจ้งเตือนเมื่อราคากระโดด", "เปรียบเทียบซัพพลายเออร์"] },
    { label: "กำไร", title: "รู้ว่าเหลือกำไรจริงเท่าไร", text: "กำไรต่อสินค้าจากราคาซื้อที่ Sabai อ่านเอง ไม่ว่าจะร้านอาหาร ร้านค้า หรือร้านเสริมสวย", badge: "แพ็กเกจ TRACKER", bullets: ["สูตรและเซ็ตสินค้า", "กำไรอัปเดตตามราคา", "ใช้ได้กับสินค้าทุกชนิด"] },
    { label: "ทีม", title: "พนักงานลงเวลา คุณคุมได้", text: "เชิญทีมทางอีเมล พวกเขาลงเวลาและดูวันลาได้ ยกเลิกสิทธิ์ได้ในแตะเดียว ประวัติยังอยู่", bullets: ["พนักงานใช้ฟรี", "ผู้จัดการในแพ็กเกจ Team และ Tracker", "คุณเลือกว่าใครเห็นใบแจ้งหนี้"] },
  ],
  why: {
    title: "ทำไมต้อง Sabai",
    no: ["กองใบแจ้งหนี้กระดาษ", "รู้ราคาขึ้นช้าเกินไป", "ซอฟต์แวร์สำหรับนักบัญชี", "นั่งพิมพ์หลายชั่วโมงทุกเดือน"],
    yes: ["แค่ถ่ายรูป", "แจ้งเตือนเมื่อราคาเปลี่ยน", "ทำมาให้เจ้าของร้าน", "ทั้งวันในตัวเลขเดียว"],
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
    title: "ถามบัญชีของคุณด้วยภาษาง่ายๆ",
    text: "เร็วๆ นี้คุณจะถาม Sabai ผ่านผู้ช่วย AI ของคุณเองได้ เป็นภาษาของคุณ",
    ask: "เดือนนี้ซื้อนมไปเท่าไร",
    answer: "4,860 บาท จาก 6 ใบ ราคาขึ้น 6% จากเดือนกันยายน",
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
      { n: "1", t: "แตะเพื่อยกเลิกสิทธิ์", d: "ตัดสิทธิ์ใครก็ได้ทันที ประวัติยังอยู่" },
    ],
  },
  final: { title: "เลิกเดา รู้ยอดของวัน", text: "เริ่มฟรี ใบแรกใช้เวลาไม่ถึงนาที", cta: "เริ่มฟรี" },
  footer: { rights: "สงวนลิขสิทธิ์", faq: "คำถามที่พบบ่อย", privacy: "ความเป็นส่วนตัว", terms: "ข้อกำหนด" },
  langs: "ภาษา",
};

const fr: L2 = {
  htmlLang: "fr",
  meta: {
    title: "Sabai : la compta facile pour les petits commerces en Thaïlande",
    description: "Photographiez vos factures, connectez votre caisse, voyez un seul chiffre clair pour la journée. Gratuit pour commencer.",
  },
  nav: { how: "Ce que ça fait", pricing: "Tarifs", security: "Sécurité", signIn: "Connexion", start: "Commencer gratuitement" },
  announce: "Conçu dans une cuisine de Samui · Testé sur de vraies factures Makro",
  hero: {
    eyebrow: "LA COMPTA FACILE POUR PETITS COMMERCES",
    lines: ["Photographiez la facture.", "Connaissez votre journée.", "Gardez votre marge."],
    sub: "Sabai lit vos factures fournisseurs, ajoute les ventes de votre caisse et affiche un seul chiffre clair pour la journée. Pour toute boutique, tout café ou petite entreprise en Thaïlande.",
    cta: "Commencer gratuitement",
    cta2: "Voir comment ça marche",
    note: "Sans carte. Gratuit à vie avec votre propre clé IA.",
  },
  hub: { invoice: "Photo de facture", till: "Caisse Loyverse", grab: "Commandes Grab", line: "LINE · Ocha", today: "AUJOURD'HUI", alert: "Alertes de prix", margin: "Marge par produit", archive: "Archive · CSV", alertV: "Œufs ▲ 9 %", marginV: "Latte glacé 68 %" },
  stats: [
    { n: "12/12", l: "prix lus correctement sur une vraie facture Makro" },
    { n: "27 s", l: "de la photo aux lignes vérifiées" },
    { n: "0", l: "connexion bancaire nécessaire" },
    { n: "0 ฿", l: "pour démarrer avec votre clé IA" },
  ],
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
      { t: "Équipe et pointage", d: "Invitez vos employés à pointer. Gratuit pour eux, vous gardez la main." },
      { t: "Fiche de paie", d: "Sécurité sociale et impôt thaïlandais calculés, à titre d'information.", soon: true },
    ],
  },
  tabs: [
    { label: "Factures", title: "Une photo, zéro saisie", text: "Prenez la photo à la livraison. Sabai remplit fournisseur, produits, quantités et prix. Vous vérifiez, vous enregistrez.", bullets: ["Factures thaï et anglais", "Jusqu'à 4 pages par facture", "Doublons signalés"] },
    { label: "Prix", title: "Repérez chaque hausse", text: "Chaque produit garde son historique de prix : un fournisseur ne peut plus augmenter en douce.", bullets: ["Historique par produit", "Alerte en cas de saut", "Comparaison des fournisseurs"] },
    { label: "Marges", title: "Sachez ce qu'il vous reste vraiment", text: "Marge par produit, d'après le prix d'achat que Sabai lit tout seul. Resto, boutique, salon : tout commerce qui vend quelque chose.", badge: "FORFAIT TRACKER", bullets: ["Recettes et lots", "La marge suit le prix", "Pour tout type de produit"] },
    { label: "Équipe", title: "Vos employés pointent, vous gardez la main", text: "Invitez-les par e-mail. Ils pointent et voient leurs jours d'absence. Retirez l'accès d'un geste, l'historique reste.", bullets: ["Employés gratuits", "Managers dans Team et Tracker", "Vous choisissez qui voit les factures"] },
  ],
  why: {
    title: "Pourquoi Sabai",
    no: ["Des piles de factures papier", "Des hausses de prix découvertes trop tard", "Un logiciel pensé pour les comptables", "Des heures de saisie chaque mois"],
    yes: ["Une photo suffit", "Une alerte quand un prix bouge", "Pensé pour le patron, pas le comptable", "Votre journée en un chiffre"],
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
    title: "Interrogez votre compta, avec des mots simples",
    text: "Bientôt, vous pourrez interroger Sabai depuis votre assistant IA, dans votre langue.",
    ask: "Combien j'ai dépensé en lait ce mois-ci ?",
    answer: "4 860 ฿ sur 6 factures. Prix en hausse de 6 % depuis septembre.",
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
      { n: "1", t: "Geste pour retirer", d: "Retirez l'accès de quelqu'un immédiatement. L'historique est conservé." },
    ],
  },
  final: { title: "Arrêtez de deviner. Connaissez votre journée.", text: "Gratuit pour commencer. Votre première facture prend moins d'une minute.", cta: "Commencer gratuitement" },
  footer: { rights: "Tous droits réservés.", faq: "FAQ", privacy: "Confidentialité", terms: "Conditions" },
  langs: "Langue",
};

const ru: L2 = {
  htmlLang: "ru",
  meta: {
    title: "Sabai: простая бухгалтерия для малого бизнеса в Таиланде",
    description: "Сфотографируйте счета, подключите кассу и увидьте одну понятную цифру за день. Бесплатно для старта.",
  },
  nav: { how: "Что умеет", pricing: "Тарифы", security: "Безопасность", signIn: "Войти", start: "Начать бесплатно" },
  announce: "Создано на кухне на Самуи · Проверено на настоящих счетах Makro",
  hero: {
    eyebrow: "ПРОСТАЯ БУХГАЛТЕРИЯ ДЛЯ МАЛОГО БИЗНЕСА",
    lines: ["Сфотографируйте счёт.", "Узнайте свой день.", "Сохраните маржу."],
    sub: "Sabai читает счета поставщиков, добавляет продажи с кассы и показывает одну понятную цифру за день. Для любого магазина, кафе или малого бизнеса в Таиланде.",
    cta: "Начать бесплатно",
    cta2: "Как это работает",
    note: "Без карты. Бесплатно навсегда с вашим ИИ-ключом.",
  },
  hub: { invoice: "Фото счёта", till: "Касса Loyverse", grab: "Заказы Grab", line: "LINE · Ocha", today: "СЕГОДНЯ", alert: "Оповещения о ценах", margin: "Маржа по товару", archive: "Архив · CSV", alertV: "Яйца ▲ 9%", marginV: "Айс-латте 68%" },
  stats: [
    { n: "12/12", l: "цен прочитано верно на настоящем счёте Makro" },
    { n: "27 с", l: "от фото до проверенных строк" },
    { n: "0", l: "подключений к банку" },
    { n: "฿0", l: "на старте со своим ИИ-ключом" },
  ],
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
      { t: "Команда и отметки", d: "Приглашайте сотрудников отмечаться. Для них бесплатно, контроль у вас." },
      { t: "Расчётный листок", d: "Тайские соцвзносы и налог считаются за вас, как справка.", soon: true },
    ],
  },
  tabs: [
    { label: "Счета", title: "Одно фото, ноль ввода", text: "Сфотографируйте при приёмке. Sabai заполнит поставщика, товары, количества и цены. Вы проверяете и сохраняете.", bullets: ["Счета на тайском и английском", "До 4 страниц в счёте", "Дубликаты помечаются"] },
    { label: "Цены", title: "Ловите каждый рост цены", text: "У каждого товара своя история цен, поставщик не поднимет цену незаметно.", bullets: ["История цен по товару", "Оповещение о скачке", "Сравнение поставщиков"] },
    { label: "Маржа", title: "Знайте, сколько остаётся на самом деле", text: "Маржа по товару на основе закупочной цены, которую Sabai читает сам. Ресторан, магазин, салон: любой бизнес, который что-то продаёт.", badge: "ТАРИФ TRACKER", bullets: ["Рецепты и наборы", "Маржа следует за ценой", "Для любого товара"] },
    { label: "Команда", title: "Сотрудники отмечаются, вы управляете", text: "Пригласите людей по e-mail. Они отмечаются и видят свои выходные. Доступ убирается одним нажатием, история остаётся.", bullets: ["Сотрудники бесплатно", "Менеджеры в Team и Tracker", "Вы решаете, кто видит счета"] },
  ],
  why: {
    title: "Почему Sabai",
    no: ["Стопки бумажных счетов", "Рост цен, о котором узнаёшь поздно", "Программы для бухгалтеров", "Часы ввода каждый месяц"],
    yes: ["Достаточно фото", "Оповещение, когда цена меняется", "Сделано для владельца, не для бухгалтера", "Ваш день в одной цифре"],
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
    title: "Спросите свою бухгалтерию простыми словами",
    text: "Скоро вы сможете спрашивать Sabai из своего ИИ-помощника на своём языке.",
    ask: "Сколько я потратил на молоко в этом месяце?",
    answer: "4 860 ฿ по 6 счетам. Цена выросла на 6% с сентября.",
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
      { n: "1", t: "Нажатие для удаления", d: "Мгновенно уберите чей-то доступ. История сохраняется." },
    ],
  },
  final: { title: "Хватит гадать. Знайте свой день.", text: "Бесплатно для старта. Первый счёт — меньше минуты.", cta: "Начать бесплатно" },
  footer: { rights: "Все права защищены.", faq: "FAQ", privacy: "Конфиденциальность", terms: "Условия" },
  langs: "Язык",
};

export const L2_COPY: Record<Lang, L2> = { en, th, fr, ru };
export const LANG_PATH: Record<Lang, string> = { en: "/", th: "/th", fr: "/fr", ru: "/ru" };
export const LANG_LABEL: Record<Lang, string> = { en: "EN", th: "ไทย", fr: "FR", ru: "RU" };
