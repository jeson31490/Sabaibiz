import { NextResponse } from "next/server";

// Which country is this request from? Vercel puts it in a header; elsewhere (local dev) it is simply unknown.
// Used only to *suggest* a language and a price zone on the public pages, never to decide what is charged.
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const raw = request.headers.get("x-vercel-ip-country") ?? "";
  const country = /^[A-Za-z]{2}$/.test(raw) ? raw.toUpperCase() : null;
  return NextResponse.json({ country }, { headers: { "Cache-Control": "no-store" } });
}
