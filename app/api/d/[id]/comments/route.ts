import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { getDB } from "@/lib/db";
import { resolveToken, canPerform } from "@/lib/permissions";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/d/:id/comments?key=TOKEN — Add a comment.
 * Requires comment, edit, or admin key.
 * Rate limited: 20 comments per minute per IP.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const limit = checkRateLimit(ip, "comment", { max: 20, windowSec: 60 });
  if (!limit.allowed) return rateLimitResponse(limit);

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

  if (!canPerform(resolved.permission, "comment")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    content: string;
    author_name?: string;
    anchor_text?: string;
    anchor_start?: number;
    anchor_end?: number;
  };

  if (!body.content?.trim()) {
    return Response.json({ error: "Comment content required" }, { status: 400 });
  }

  const commentId = nanoid(16);

  await db
    .prepare(
      `INSERT INTO comments (id, document_id, author_name, content, anchor_text, anchor_start, anchor_end)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      commentId,
      id,
      body.author_name || "Anonymous",
      body.content.trim(),
      body.anchor_text || null,
      body.anchor_start ?? null,
      body.anchor_end ?? null
    )
    .run();

  return Response.json({ id: commentId, status: "created" }, { status: 201 });
}

/**
 * GET /api/d/:id/comments?key=TOKEN — List comments.
 * Any valid key can read comments.
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

  const comments = await db
    .prepare(
      `SELECT id, author_name, content, anchor_text, anchor_start, anchor_end, resolved, created_at
       FROM comments
       WHERE document_id = ?
       ORDER BY created_at DESC`
    )
    .bind(id)
    .all();

  return Response.json({ comments: comments.results });
}
