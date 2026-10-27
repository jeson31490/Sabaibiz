// Words of the public pages, in English and Thai. Keep both in step: the page is built from this.
// The Thai wording should be proofread by a native speaker before a big advertising push.

export type Lang = "en" | "th";

export type LandingCopy = {
  htmlLang: string;
  meta: { title: string; description: string };
  nav: { how: string; pricing: string; security: string; signIn: string; start: string; otherLang: { label: string; href: string } };
  hero: {
    /** One line each, so the headline breaks where the sentences do. */
    title: string[];
    subtitle: string;
    primary: string;
    secondary: string;
    note: string;
    mascotAlt: string;
  };
  ticket: {
    heading: string;
    example: string;
    sales: string;
    outLabel: string;
    suppliers: [string, string, string];
    left: string;
  };
  how: {
    title: string;
    steps: { title: string; text: string; alt: string }[];
  };
  together: {
    title: string;
    intro: string;
    items: { title: string; text: string }[];
    live: string;
    soon: string;
  };
  owners: {
    title: string;
    points: { title: string; text: string }[];
  };
  pricing: {
    title: string;
    intro: string;
    perMonth: string;
    soon: string;
    recommended: string;
    cta: string;
    payLater: string;
    discounts: string;
  };
  trust: {
    title: string;
    points: string[];
    mascotAlt: string;
  };
  closing: { title: string; text: string; cta: string; mascotAlt: string };
  footer: { rights: string; faq: string; privacy: string; terms: string; contact: string };
};

export const COPY: Record<Lang, LandingCopy> = {
  en: {
    htmlLang: "en",
    meta: {
      title: "Sabai: photograph your invoices, see today's money in and out",
      description:
        "Sabai reads your supplier invoices, adds your till sales and shows what came in and went out today. Made for shops, cafés and restaurants in Thailand.",
    },
    nav: {
      how: "How it works",
      pricing: "Pricing",
      security: "Security",
      signIn: "Sign in",
      start: "Start free",
      otherLang: { label: "ไทย", href: "/th" },
    },
    hero: {
      title: ["Photograph your invoices.", "See what came in and went out today."],
      subtitle:
        "Sabai reads every supplier invoice, adds your till sales, and shows one clear number for the day. No accounting course needed.",
      primary: "Start free",
      secondary: "See pricing",
      note: "Free plan: track your prices by hand. Invoice reading is on paid plans. No card needed.",
      mascotAlt: "The Sabai mascot presenting your day",
    },
    ticket: {
      heading: "Today",
      example: "Example day",
      sales: "Sales from your till",
      outLabel: "Invoices",
      suppliers: ["Makro", "Egg supplier", "Fresh market"],
      left: "Left after invoices",
    },
    how: {
      title: "Three steps, no typing",
      steps: [
        {
          title: "Take a photo of the invoice",
          text: "At the delivery door, from your phone. You or your staff, no typing.",
          alt: "The mascot photographing an invoice with a phone",
        },
        {
          title: "Sabai reads it",
          text: "Products, quantities, prices and the supplier are filled in for you. You check them in a few seconds.",
          alt: "The mascot scanning an invoice",
        },
        {
          title: "See today's money",
          text: "Invoices and your till sales sit side by side, so you know what came in and what went out.",
          alt: "The mascot presenting a sales chart",
        },
      ],
    },
    together: {
      title: "Your invoices and your till, side by side",
      intro: "Everything that touches your money, in one place you can open from your phone.",
      items: [
        { title: "Every invoice, kept", text: "Each supplier invoice is saved with its photo and stays searchable." },
        { title: "Your till connected", text: "Sales from Loyverse sync on their own." },
        { title: "Prices watched", text: "See when a supplier raises the price of milk, oil or eggs." },
        { title: "Staff can help", text: "Your team gets their own accounts and can scan invoices for you." },
      ],
      live: "Live",
      soon: "Soon",
    },
    owners: {
      title: "Built for shop owners, not accountants",
      points: [
        { title: "No accounting course", text: "Take a photo and you're using it. There's nothing to learn first." },
        {
          title: "Not linked to any bank or tax office",
          text: "Sabai only sees the invoices you photograph and the sales your till shares.",
        },
        { title: "Start free", text: "Track your prices by hand. Add invoice reading when you want it." },
      ],
    },
    pricing: {
      title: "Simple prices, in baht",
      intro: "Start free. Move up to read invoices automatically or add team accounts.",
      perMonth: "/month",
      soon: "Soon",
      recommended: "Recommended",
      cta: "Start free",
      payLater: "Paid plans open inside the app once online payment is available.",
      discounts: "Pay 6 months at once and save 10%, or a year and save 20%.",
    },
    trust: {
      title: "Your numbers stay yours",
      points: [
        "We never sell or share your business data.",
        "Encrypted in transit and at rest.",
        "Not connected to any bank or tax office.",
        "Invoice photos are read by an AI service only to pull out the figures.",
      ],
      mascotAlt: "The mascot guarding your data",
    },
    closing: {
      title: "Start with your prices today",
      text: "Sign up free, add your ingredients, and add invoice reading when you are ready.",
      cta: "Start free",
      mascotAlt: "The Sabai mascot",
    },
    footer: { rights: "All rights reserved.", faq: "FAQ", privacy: "Privacy", terms: "Terms", contact: "Contact" },
  },

  th: {
    htmlLang: "th",
    meta: {
      title: "Sabai: ถ่ายรูปบิล ดูเงินเข้า-ออกของวันนี้ได้ทันที",
      description:
        "Sabai อ่านบิลจากซัพพลายเออร์ รวมกับยอดขายจากเครื่องคิดเงิน แล้วสรุปเงินเข้า-ออกของวันนี้ ออกแบบมาสำหรับร้านค้า คาเฟ่ และร้านอาหารในประเทศไทย",
    },
    nav: {
      how: "วิธีใช้งาน",
      pricing: "ราคา",
      security: "ความปลอดภัย",
      signIn: "เข้าสู่ระบบ",
      start: "เริ่มใช้ฟรี",
      otherLang: { label: "EN", href: "/" },
    },
    hero: {
      title: ["ถ่ายรูปบิล", "แล้วเห็นเงินเข้า-เงินออกของวันนี้ทันที"],
      subtitle:
        "Sabai อ่านบิลจากซัพพลายเออร์ทุกใบ รวมกับยอดขายจากเครื่องคิดเงิน แล้วสรุปให้เห็นตัวเลขของวันในที่เดียว ไม่ต้องเรียนบัญชี",
      primary: "เริ่มใช้ฟรี",
      secondary: "ดูราคา",
      note: "แพ็กเกจฟรี จดราคาวัตถุดิบเองได้ การอ่านบิลอัตโนมัติอยู่ในแพ็กเกจที่ชำระเงิน ไม่ต้องใช้บัตร",
      mascotAlt: "มาสคอต Sabai กำลังนำเสนอตัวเลขของวัน",
    },
    ticket: {
      heading: "วันนี้",
      example: "ตัวอย่าง",
      sales: "ยอดขายจากเครื่องคิดเงิน",
      outLabel: "บิลซื้อของ",
      suppliers: ["แม็คโคร", "ร้านไข่", "ตลาดสด"],
      left: "เหลือหลังหักบิล",
    },
    how: {
      title: "สามขั้นตอน ไม่ต้องพิมพ์",
      steps: [
        {
          title: "ถ่ายรูปบิล",
          text: "ตอนของมาส่งหน้าร้าน ถ่ายด้วยมือถือได้เลย เจ้าของหรือพนักงานก็ทำได้ ไม่ต้องพิมพ์",
          alt: "มาสคอตกำลังถ่ายรูปบิลด้วยมือถือ",
        },
        {
          title: "Sabai อ่านให้",
          text: "ชื่อสินค้า จำนวน ราคา และร้านที่ซื้อ ถูกกรอกให้อัตโนมัติ คุณแค่ตรวจดูไม่กี่วินาที",
          alt: "มาสคอตกำลังสแกนบิล",
        },
        {
          title: "ดูเงินของวันนี้",
          text: "บิลซื้อของและยอดขายจากเครื่องคิดเงินอยู่ด้วยกัน เห็นเลยว่าเงินเข้าเท่าไหร่ ออกเท่าไหร่",
          alt: "มาสคอตกำลังนำเสนอกราฟยอดขาย",
        },
      ],
    },
    together: {
      title: "บิลกับเครื่องคิดเงิน อยู่ที่เดียวกัน",
      intro: "ทุกอย่างที่เกี่ยวกับเงินของร้าน เปิดดูจากมือถือได้ในที่เดียว",
      items: [
        { title: "เก็บบิลทุกใบ", text: "ทุกบิลจากซัพพลายเออร์ถูกเก็บพร้อมรูป และค้นหาได้ตลอด" },
        { title: "เชื่อมเครื่องคิดเงิน", text: "ยอดขายจาก Loyverse ซิงค์เข้ามาเอง" },
        { title: "จับตาราคาวัตถุดิบ", text: "รู้ทันทีเมื่อซัพพลายเออร์ขึ้นราคานม น้ำมัน หรือไข่" },
        { title: "ให้พนักงานช่วยสแกน", text: "ทีมงานมีบัญชีของตัวเอง และช่วยสแกนบิลให้คุณได้" },
      ],
      live: "ใช้งานได้แล้ว",
      soon: "เร็วๆ นี้",
    },
    owners: {
      title: "ออกแบบมาสำหรับเจ้าของร้าน ไม่ใช่นักบัญชี",
      points: [
        { title: "ไม่ต้องเรียนบัญชี", text: "ถ่ายรูปแล้วใช้งานได้เลย ไม่มีอะไรต้องเรียนก่อน" },
        {
          title: "ไม่ผูกกับธนาคารหรือสรรพากร",
          text: "Sabai เห็นเฉพาะบิลที่คุณถ่าย และยอดขายที่เครื่องคิดเงินแชร์ให้",
        },
        { title: "เริ่มใช้ฟรี", text: "จดราคาวัตถุดิบเองได้ และเพิ่มการอ่านบิลเมื่อพร้อม" },
      ],
    },
    pricing: {
      title: "ราคาชัดเจน เป็นเงินบาท",
      intro: "เริ่มฟรี แล้วอัปเกรดเมื่อต้องการให้ระบบอ่านบิลอัตโนมัติหรือเพิ่มบัญชีทีมงาน",
      perMonth: "/เดือน",
      soon: "เร็วๆ นี้",
      recommended: "แนะนำ",
      cta: "เริ่มใช้ฟรี",
      payLater: "แพ็กเกจแบบชำระเงินจะเปิดในแอปเมื่อระบบชำระเงินออนไลน์พร้อมใช้งาน",
      discounts: "จ่ายล่วงหน้า 6 เดือนลด 10% จ่ายทั้งปีลด 20%",
    },
    trust: {
      title: "ตัวเลขของคุณเป็นของคุณ",
      points: [
        "เราไม่ขายหรือแชร์ข้อมูลธุรกิจของคุณ",
        "เข้ารหัสทั้งระหว่างส่งและตอนจัดเก็บ",
        "ไม่เชื่อมกับธนาคารหรือสรรพากร",
        "รูปบิลถูกอ่านด้วยบริการ AI เพื่อดึงตัวเลขเท่านั้น",
      ],
      mascotAlt: "มาสคอตกำลังปกป้องข้อมูลของคุณ",
    },
    closing: {
      title: "เริ่มจากราคาวัตถุดิบของคุณวันนี้",
      text: "สมัครฟรี เพิ่มวัตถุดิบของคุณ และเพิ่มการอ่านบิลเมื่อพร้อม",
      cta: "เริ่มใช้ฟรี",
      mascotAlt: "มาสคอต Sabai",
    },
    footer: { rights: "สงวนลิขสิทธิ์", faq: "คำถามที่พบบ่อย", privacy: "ความเป็นส่วนตัว", terms: "ข้อกำหนด", contact: "ติดต่อ" },
  },
};
