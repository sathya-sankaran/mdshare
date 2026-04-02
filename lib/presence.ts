/**
 * In-memory presence tracker with heartbeat model.
 * Entries expire after 45 seconds of no heartbeat.
 * Cleanup runs at most once per 10 seconds to avoid per-request overhead.
 */

interface PresenceEntry {
  name: string;
  lastSeen: number;
}

const store = new Map<string, Map<string, PresenceEntry>>();
const EXPIRY_MS = 45_000;

let lastCleanup = 0;

function cleanupIfNeeded(docId: string) {
  const now = Date.now();
  if (now - lastCleanup < 10_000) return;
  lastCleanup = now;

  const doc = store.get(docId);
  if (!doc) return;
  for (const [sessionId, entry] of doc) {
    if (now - entry.lastSeen > EXPIRY_MS) doc.delete(sessionId);
  }
  if (doc.size === 0) store.delete(docId);
}

export function heartbeat(docId: string, sessionId: string, name: string) {
  if (!store.has(docId)) store.set(docId, new Map());
  store.get(docId)!.set(sessionId, { name, lastSeen: Date.now() });
  cleanupIfNeeded(docId);
}

export function getPresence(docId: string): { name: string }[] {
  cleanupIfNeeded(docId);
  const doc = store.get(docId);
  if (!doc) return [];
  const seen = new Set<string>();
  const result: { name: string }[] = [];
  for (const entry of doc.values()) {
    if (!seen.has(entry.name)) {
      seen.add(entry.name);
      result.push({ name: entry.name });
    }
  }
  return result;
}
