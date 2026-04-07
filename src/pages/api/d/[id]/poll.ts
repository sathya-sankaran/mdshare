import type { APIRoute } from "astro";
import { getDB } from "../../../../../lib/db";
import { resolveToken } from "../../../../../lib/permissions";
import { heartbeat, getPresence } from "../../../../../lib/presence";
import { checkRateLimit, rateLimitResponse } from "../../../../../lib/rate-limit";

export const prerender = false;

export const POST: APIRoute = async ({ request, params }) => {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const limit = checkRateLimit(ip, "poll", { max: 20, windowSec: 60 });
  if (!limit.allowed) return rateLimitResponse(limit);

  const id = params.id!;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) return Response.json({ error: "Not found" }, { status: 404 });

  const db = getDB();
  const resolved = await resolveToken(db, key);
  if (!resolved || resolved.documentId !== id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    session_id?: string;
    name?: string;
    content_hash?: string;
  };

  if (body.session_id) {
    heartbeat(id, body.session_id, body.name || "Anonymous");
  }

  const doc = await db
    .prepare("SELECT content, content_hash, updated_at FROM documents WHERE id = ?")
    .bind(id)
    .first<{ content: string; content_hash: string; updated_at: string }>();

  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  const contentChanged = body.content_hash && doc.content_hash !== body.content_hash;

  const comments = await db
    .prepare(
      `SELECT id, author_name, content, anchor_text, anchor_start, anchor_end, resolved, parent_id, created_at
       FROM comments WHERE document_id = ? ORDER BY created_at ASC`
    )
    .bind(id)
    .all();

  const viewers = getPresence(id);

  return Response.json({
    content_hash: doc.content_hash,
    content: contentChanged ? doc.content : undefined,
    updated_at: doc.updated_at,
    comments: comments.results,
    viewers,
    viewer_count: viewers.length,
  });
};
