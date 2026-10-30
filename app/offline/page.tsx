export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="app-dark flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl" aria-hidden>
        📡
      </div>
      <h1 className="text-2xl font-bold text-cream">You are offline</h1>
      <p className="max-w-xs text-sm opacity-80">
        SabaiBiz needs a connection to read your invoices and show today&apos;s numbers. Reconnect and try again.
        <br />
        <span lang="th">ไม่มีสัญญาณอินเทอร์เน็ต ลองใหม่อีกครั้งเมื่อกลับมาออนไลน์</span>
      </p>
    </main>
  );
}
