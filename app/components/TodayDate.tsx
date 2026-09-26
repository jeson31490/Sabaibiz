"use client";

// Rendered on the client so it shows the visitor's real "today", not the build date.
export default function TodayDate() {
  const text = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return <span suppressHydrationWarning>{text}</span>;
}
