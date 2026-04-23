/**
 * Increment a cumulative stat counter.
 * These survive document deletion — they're lifetime totals.
 */
export async function incrementStat(db: D1Database, key: string, amount = 1) {
  await db
    .prepare("UPDATE stats SET value = value + ? WHERE key = ?")
    .bind(amount, key)
    .run();
}

export async function getStats(db: D1Database): Promise<{
  documents_created: number;
  documents_shared: number;
  comments_posted: number;
  collaborators: number;
}> {
  const rows = await db
    .prepare("SELECT key, value FROM stats")
    .all<{ key: string; value: number }>();

  const result = { documents_created: 0, documents_shared: 0, comments_posted: 0, collaborators: 0 };
  for (const row of rows.results || []) {
    if (row.key in result) {
      (result as Record<string, number>)[row.key] = row.value;
    }
  }
  return result;
}
