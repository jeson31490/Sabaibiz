"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchNotifications, markAllNotificationsRead, type AppNotification } from "./notifications";
import { useLiveReload } from "./useLiveReload";

/** The signed-in owner's or manager's notifications, kept live. Pass enabled=false for everyone else. */
export function useNotifications(enabled: boolean) {
  const [items, setItems] = useState<AppNotification[]>([]);

  // A failed refresh keeps what is on screen: a notice isn't worth an error message.
  const refresh = useCallback(() => {
    fetchNotifications()
      .then(setItems)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchNotifications()
      .then((next) => {
        if (!cancelled) setItems(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useLiveReload(["notifications"], refresh, enabled);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    // Show it as read straight away; put it back if the database refuses.
    let previous: AppNotification[] = [];
    setItems((prev) => {
      previous = prev;
      return prev.map((n) => (n.readAt ? n : { ...n, readAt: now }));
    });
    try {
      await markAllNotificationsRead();
    } catch {
      setItems(previous);
    }
  }, []);

  return { items, unread: items.filter((n) => !n.readAt).length, markAllRead };
}
