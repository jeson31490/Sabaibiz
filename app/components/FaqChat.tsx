"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FALLBACK, SUGGESTED, bestMatch, entryAnswer, entryQuestion, type Lang } from "../../lib/faqBot";

type Msg = { from: "bot" | "me"; text: string };
const UI = {
  en: { open: "Help", title: "Juliette", ph: "Ask a question…", send: "Send", close: "Close", sub: "Automated helper", hi: "Hi, I'm Juliette, SabaiBiz's automated helper. Ask me about prices, scanning or your data." },
  th: { open: "ช่วยเหลือ", title: "Juliette", ph: "พิมพ์คำถาม…", send: "ส่ง", close: "ปิด", sub: "ผู้ช่วยอัตโนมัติ", hi: "สวัสดี ฉันคือ Juliette ผู้ช่วยอัตโนมัติของ SabaiBiz ถามเรื่องราคา การสแกน หรือข้อมูลของคุณได้เลย" },
  fr: { open: "Aide", title: "Juliette", ph: "Posez une question…", send: "Envoyer", close: "Fermer", sub: "Assistante automatique", hi: "Bonjour, je suis Juliette, l'assistante automatique de SabaiBiz. Posez-moi vos questions sur les prix, les scans ou vos données." },
};
// Shown on public pages only: not inside the signed-in app (dashboard) or the account forms.
const PUBLIC = /^\/(th|fr|ru)?\/?$|^\/(faq|privacy|terms)(\/|$)/;


function JulietteAvatar({ size = 36 }: { size?: number }) {
  // Original illustrated portrait (not a photo): dark bob, warm skin, lagoon background.
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Juliette" className="shrink-0 rounded-full">
      <rect width="64" height="64" fill="#19D3B5" />
      <path d="M12 64c2-12 10-16 20-16s18 4 20 16z" fill="#E8B94A" />
      <rect x="27" y="40" width="10" height="10" rx="4" fill="#E9B98F" />
      <ellipse cx="32" cy="29" rx="14" ry="16" fill="#F1C9A5" />
      <path d="M16 31c-3-18 8-23 17-23s19 6 15 23c-1-9-5-14-15-14s-14 5-17 14z" fill="#16161d" />
      <path d="M16 31c0 8 2 13 5 15-1-7-1-12 0-18zM48 31c0 8-2 13-5 15 1-7 1-12 0-18z" fill="#16161d" />
      <path d="M24.5 30q2.5-2 5 0M34.5 30q2.5-2 5 0" stroke="#16161d" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M28 37q4 3.5 8 0" stroke="#B5524A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="23.5" cy="34.5" r="2.2" fill="#F0A58F" opacity=".55" />
      <circle cx="40.5" cy="34.5" r="2.2" fill="#F0A58F" opacity=".55" />
    </svg>
  );
}

export default function FaqChat() {
  const path = usePathname() ?? "/";
  const lang: Lang = path.startsWith("/th") ? "th" : path.startsWith("/fr") ? "fr" : "en";
  const t = UI[lang];
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  if (!PUBLIC.test(path)) return null;

  const ask = (q: string, id?: string | null) => {
    const found = id === undefined ? bestMatch(q) : id;
    const reply = found ? entryAnswer(found, lang) : FALLBACK[lang];
    setMsgs((m) => [...m, { from: "me", text: q }, { from: "bot", text: reply }]);
    setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth" }), 30);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim().slice(0, 200);
    if (!q) return;
    setText("");
    ask(q);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {open ? (
        <div role="dialog" aria-label={t.title} className="flex h-[26rem] w-[19rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[#19D3B5]/30 bg-[#072A2B] text-[#F4EBD8] shadow-2xl">
          <div className="flex items-center justify-between bg-[#031B1C] px-4 py-3">
            <span className="flex items-center gap-2"><JulietteAvatar /><span className="leading-tight"><span className="block font-semibold text-[#E8B94A]">{t.title}</span><span className="block text-xs text-[#F4EBD8]/70">{t.sub}</span></span></span>
            <button onClick={() => setOpen(false)} aria-label={t.close} className="text-xl leading-none">×</button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3 text-sm">
            <p className="rounded-xl bg-[#031B1C] px-3 py-2">{t.hi}</p>
            {msgs.map((m, i) => (
              <p key={i} className={m.from === "me" ? "ml-8 rounded-xl bg-[#19D3B5] px-3 py-2 text-[#031B1C]" : "mr-4 rounded-xl bg-[#031B1C] px-3 py-2"}>{m.text}</p>
            ))}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {SUGGESTED.map((id) => (
                <button key={id} onClick={() => ask(entryQuestion(id, lang), id)} className="rounded-full border border-[#19D3B5]/50 px-2.5 py-1 text-xs hover:bg-[#19D3B5]/15">{entryQuestion(id, lang)}</button>
              ))}
            </div>
            <div ref={end} />
          </div>
          <form onSubmit={submit} className="flex gap-2 border-t border-[#19D3B5]/20 p-2">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder={t.ph} className="min-w-0 flex-1 rounded-lg bg-[#031B1C] px-3 py-2 text-sm outline-none placeholder:text-[#F4EBD8]/50" />
            <button className="rounded-lg bg-[#E8B94A] px-3 py-2 text-sm font-semibold text-[#031B1C]">{t.send}</button>
          </form>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-full bg-[#19D3B5] py-1.5 pl-1.5 pr-4 text-sm font-semibold text-[#031B1C] shadow-lg"><JulietteAvatar size={32} />{t.open}</button>
      )}
    </div>
  );
}
