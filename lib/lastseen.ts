import { useState, useEffect, useCallback } from "react";

// localStorage-only "last seen" tracker for the unread-comments badge.
// One key per document. Browser-scoped, no identity, no server state.

const KEY_PREFIX = "mdshare_lastseen_";
const MAX_KEYS = 50;

function key(docId: string) {
  return `${KEY_PREFIX}${docId}`;
}

function readLastSeen(docId: string): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(key(docId));
}

function writeLastSeen(docId: string, iso: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key(docId), iso);
}

/**
 * Seed lastseen to "now" if not yet set, so a first visit doesn't show
 * "all comments are unread" noise. Returns the value that ended up stored.
 */
export function seedLastSeenIfMissing(docId: string): string {
  const existing = readLastSeen(docId);
  if (existing) return existing;
  const now = new Date().toISOString();
  writeLastSeen(docId, now);
  return now;
}

/**
 * Trim oldest lastseen entries past MAX_KEYS so localStorage doesn't grow
 * unbounded across hundreds of docs. Cheap to call on mount.
 */
export function pruneLastSeen() {
  if (typeof localStorage === "undefined") return;
  const entries: [string, string][] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(KEY_PREFIX)) {
      const v = localStorage.getItem(k);
      if (v) entries.push([k, v]);
    }
  }
  if (entries.length <= MAX_KEYS) return;
  entries.sort((a, b) => a[1].localeCompare(b[1]));
  const toDelete = entries.slice(0, entries.length - MAX_KEYS);
  for (const [k] of toDelete) localStorage.removeItem(k);
}

interface CommentLike {
  created_at: string;
}

function countUnread(lastSeen: string | null, comments: CommentLike[]): number {
  if (!lastSeen) return 0;
  // SQLite returns timestamps without trailing Z; treat as UTC.
  const cutoff = new Date(lastSeen).getTime();
  let n = 0;
  for (const c of comments) {
    if (new Date(c.created_at + "Z").getTime() > cutoff) n++;
  }
  return n;
}

/**
 * Returns the current unread count and a `markSeen()` function that advances
 * lastseen to "now". Listens to the `storage` event so cross-tab clears reflect
 * here in real-time.
 */
export function useUnreadCount(docId: string, comments: CommentLike[]) {
  const [lastSeen, setLastSeen] = useState<string | null>(() =>
    typeof localStorage === "undefined" ? null : readLastSeen(docId)
  );

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key(docId)) setLastSeen(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [docId]);

  const markSeen = useCallback(() => {
    const now = new Date().toISOString();
    writeLastSeen(docId, now);
    setLastSeen(now);
    // The `storage` event does NOT fire in the same tab that wrote it, so
    // any other tab will be notified by the listener above; this tab updates
    // its own state directly via setLastSeen.
  }, [docId]);

  return { unreadCount: countUnread(lastSeen, comments), markSeen };
}
