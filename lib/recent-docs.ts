
const STORAGE_KEY = "mdshare_recent";
const MAX_RECENT = 10;

export interface RecentDoc {
  id: string;
  title: string;
  key: string;
  permission: string;
  visitedAt: number;
}

export function saveRecentDoc(doc: Omit<RecentDoc, "visitedAt">) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as RecentDoc[];
    // Remove existing entry for same doc+permission
    const filtered = stored.filter(
      (d) => !(d.id === doc.id && d.key === doc.key)
    );
    // Add to front
    filtered.unshift({ ...doc, visitedAt: Date.now() });
    // Keep only MAX_RECENT
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(filtered.slice(0, MAX_RECENT))
    );
  } catch {
    // localStorage may be unavailable (private mode, quota); silently no-op.
  }
}

export function getRecentDocs(): RecentDoc[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as RecentDoc[];
  } catch {
    return [];
  }
}
