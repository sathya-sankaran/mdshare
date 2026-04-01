import { NextRequest } from "next/server";
import { getDB } from "@/lib/db";
import { resolveToken } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/d/:id/versions?key=TOKEN — List edit history.
 * Returns who edited, when, and via what channel. No content (lightweight).
 * Any valid key can read versions.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDB();
  const resolved = await resolveToken(db, key);
  if (!resolved || resolved.documentId !== id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const versions = await db
    .prepare(
      `SELECT id, edited_by, edited_via, content_hash, created_at
       FROM versions
       WHERE document_id = ?
       ORDER BY created_at DESC
       LIMIT 50`
    )
    .bind(id)
    .all();

  return Response.json({ versions: versions.results });
}
