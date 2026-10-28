"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** The installed app (home-screen icon) should open on the dashboard, never on the public landing page. */
export default function StandaloneRedirect() {
  const router = useRouter();
  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) router.replace("/dashboard");
  }, [router]);
  return null;
}
