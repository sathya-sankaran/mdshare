import type { APIRoute } from "astro";
import { nanoid } from "nanoid";
import { getDB } from "../../../../../lib/db";
import { resolveToken, canPerform } from "../../../../../lib/permissions";
import { checkRateLimit, rateLimitResponse } from "../../../../../lib/rate-limit";
import { incrementStat } from "../../../../../lib/stats";

export const prerender = false;

export const POST: APIRoute = async ({ request, params }) => {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const limit = checkRateLimit(ip, "comment", { max: 20, windowSec: 60 });
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

  let parentId = body.parent_id || null;
  if (parentId) {
    const parent = await db
      .prepare("SELECT parent_id FROM comments WHERE id = ? AND document_id = ?")
      .bind(parentId, id)
      .first<{ parent_id: string | null }>();
    if (!parent) {
      return Response.json({ error: "Parent comment not found" }, { status: 400 });
    }
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
};

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
};
