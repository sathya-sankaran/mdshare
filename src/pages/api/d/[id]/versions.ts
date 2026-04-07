import type { APIRoute } from "astro";
import { getDB } from "../../../../../lib/db";
import { resolveToken } from "../../../../../lib/permissions";

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const id = params.id!;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) return Response.json({ error: "Not found" }, { status: 404 });

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
};
