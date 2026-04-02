import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { getDB } from "@/lib/db";
import { resolveToken, canPerform } from "@/lib/permissions";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { incrementStat } from "@/lib/stats";

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
    parent_id?: string;
  };

  if (!body.content?.trim()) {
    return Response.json({ error: "Comment content required" }, { status: 400 });
  }

  // Replies can only go one level deep
  let parentId = body.parent_id || null;
  if (parentId) {
    const parent = await db
      .prepare("SELECT parent_id FROM comments WHERE id = ? AND document_id = ?")
      .bind(parentId, id)
      .first<{ parent_id: string | null }>();
    if (!parent) {
      return Response.json({ error: "Parent comment not found" }, { status: 400 });
    }
    // If replying to a reply, attach to the root parent instead
    if (parent.parent_id) {
      parentId = parent.parent_id;
    }
  }

  const commentId = nanoid(16);

  await db
    .prepare(
      `INSERT INTO comments (id, document_id, author_name, content, anchor_text, anchor_start, anchor_end, parent_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      commentId,
      id,
      body.author_name || "Anonymous",
      body.content.trim(),
      body.anchor_text || null,
      body.anchor_start ?? null,
      body.anchor_end ?? null,
      parentId
    )
    .run();

  await incrementStat(db, "comments_posted");

  // Track unique collaborator names
  const authorName = body.author_name || "Anonymous";
  if (authorName !== "Anonymous") {
    const existing = await db
      .prepare("SELECT COUNT(*) as cnt FROM comments WHERE author_name = ?")
      .bind(authorName)
      .first<{ cnt: number }>();
    if (existing && existing.cnt === 1) {
      await incrementStat(db, "collaborators");
    }
  }

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
      `SELECT id, author_name, content, anchor_text, anchor_start, anchor_end, resolved, parent_id, created_at
       FROM comments
       WHERE document_id = ?
       ORDER BY created_at ASC`
    )
    .bind(id)
    .all();

  return Response.json({ comments: comments.results });
}
