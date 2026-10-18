"use client";

import { useEffect, useRef } from "react";
import { supabase } from "./supabase";

let channelCount = 0;

/**
 * Calls `reload` when rows change in any of the tables (Supabase Realtime), so a screen stays live
 * without refreshing. Row Level Security still applies: you only hear about rows you may read.
 * It also reloads once a minute, so the screen stays fresh even if Realtime isn't enabled
 * for a table (see supabase/19_notifications_live_manager.sql).
 */
export function useLiveReload(tables: string[], reload: () => void, enabled = true) {
  const reloadRef = useRef(reload);
  useEffect(() => {
    reloadRef.current = reload;
  });

  const key = tables.join(",");
  useEffect(() => {
    if (!enabled) return;

    // A burst of changes (several rows at once) reloads once.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const trigger = () => {
      clearTimeout(timer);
      timer = setTimeout(() => reloadRef.current(), 400);
    };

    const channel = supabase.channel(`live-reload-${++channelCount}`);
    for (const table of key.split(",")) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, trigger);
    }
    channel.subscribe();
    const poll = setInterval(trigger, 60_000);

    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [enabled, key]);
}
