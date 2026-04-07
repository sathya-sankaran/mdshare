import type { APIRoute } from "astro";
import { getDB } from "../../../../lib/db";
import type { DocumentRow } from "../../../../lib/db";
import { resolveToken, canPerform } from "../../../../lib/permissions";
import { sanitizeMarkdown, contentHash } from "../../../../lib/sanitize";
import { nanoid } from "nanoid";
import { checkRateLimit, rateLimitResponse } from "../../../../lib/rate-limit";
import { broadcastUpdate } from "../../../../lib/broadcast";

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const id = params.id!;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDB();
  const resolved = await resolveToken(db, key);
  if (!resolved || resolved.documentId !== id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const doc = await db
    .prepare("SELECT * FROM documents WHERE id = ?")
    .bind(id)
    .first<DocumentRow>();

  if (!doc) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const expiresAt = (doc as unknown as { expires_at?: string }).expires_at;
  if (expiresAt && new Date(expiresAt) < new Date()) {
    await db.prepare("DELETE FROM documents WHERE id = ?").bind(id).run();
    return Response.json({ error: "Document has expired" }, { status: 410 });
  }

  const accept = request.headers.get("accept") || "";

  if (accept.includes("text/markdown")) {
    return new Response(doc.content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "X-Content-Source": "user-generated",
      },
    });
  }

  const lastVersion = await db
    .prepare(
      `SELECT edited_by, edited_via, created_at FROM versions
       WHERE document_id = ? ORDER BY created_at DESC LIMIT 1`
    )
    .bind(id)
    .first<{ edited_by: string | null; edited_via: string | null; created_at: string }>();

  return Response.json(
    {
      document_id: doc.id,
      title: doc.title,
      content: doc.content,
      content_hash: doc.content_hash,
      permission: resolved.permission,
      last_edited_by: lastVersion?.edited_by || null,
      last_edited_via: lastVersion?.edited_via || null,
      last_edited_at: lastVersion?.created_at || null,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    },
    { headers: { "X-Content-Source": "user-generated" } }
  );
};

export const PUT: APIRoute = async ({ request, params }) => {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const limit = checkRateLimit(ip, "update", { max: 30, windowSec: 60 });
  if (!limit.allowed) return rateLimitResponse(limit);

  const id = params.id!;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDB();
  const resolved = await resolveToken(db, key);
  if (!resolved || resolved.documentId !== id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (!canPerform(resolved.permission, "edit")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const rawContent = await request.text();
  if (!rawContent.trim()) {
    return Response.json({ error: "Empty content" }, { status: 400 });
  }

  let content: string;
  try {
    content = await sanitizeMarkdown(rawContent);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
  const hash = await contentHash(content);

  const current = await db
    .prepare("SELECT content, content_hash FROM documents WHERE id = ?")
    .bind(id)
    .first<{ content: string; content_hash: string }>();

  if (!current) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (current.content_hash === hash) {
    return Response.json({ status: "unchanged" });
  }

  const versionId = nanoid(16);
  const editedVia = request.headers.get("x-edited-via") || "api";
  const editedBy = request.headers.get("x-author") || "Anonymous";

  await db.batch([
    db
      .prepare(
        `INSERT INTO versions (id, document_id, content, content_hash, edited_via, edited_by)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(versionId, id, current.content, current.content_hash, editedVia, editedBy),
    db
      .prepare(
        `UPDATE documents SET content = ?, content_hash = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(content, hash, id),
  ]);

  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    await db
      .prepare("UPDATE documents SET title = ? WHERE id = ?")
      .bind(headingMatch[1].trim(), id)
      .run();
  }

  await broadcastUpdate(id, content, hash);

  return Response.json({ status: "updated", content_hash: hash });
};

export const PATCH: APIRoute = async ({ request, params }) => {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const limit = checkRateLimit(ip, "update", { max: 30, windowSec: 60 });
  if (!limit.allowed) return rateLimitResponse(limit);

  const id = params.id!;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDB();
  const resolved = await resolveToken(db, key);
  if (!resolved || resolved.documentId !== id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (!canPerform(resolved.permission, "edit")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    operations: { find: string; replace: string; replace_all?: boolean }[];
    author?: string;
  };

  if (!body.operations || !Array.isArray(body.operations) || body.operations.length === 0) {
    return Response.json({ error: "operations array is required" }, { status: 400 });
  }

  const current = await db
    .prepare("SELECT content, content_hash FROM documents WHERE id = ?")
    .bind(id)
    .first<{ content: string; content_hash: string }>();

  if (!current) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let content = current.content;
  const results: { index: number; status: string }[] = [];

  for (let i = 0; i < body.operations.length; i++) {
    const op = body.operations[i];
    if (!op.find || op.replace === undefined) {
      results.push({ index: i, status: "invalid" });
      continue;
    }

    if (op.replace_all) {
      if (!content.includes(op.find)) {
        results.push({ index: i, status: "not_found" });
      } else {
        content = content.split(op.find).join(op.replace);
        results.push({ index: i, status: "ok" });
      }
      continue;
    }

    const firstIndex = content.indexOf(op.find);
    if (firstIndex === -1) {
      results.push({ index: i, status: "not_found" });
      continue;
    }

    if (firstIndex !== content.lastIndexOf(op.find)) {
      results.push({ index: i, status: "ambiguous" });
      continue;
    }

    content = content.slice(0, firstIndex) + op.replace + content.slice(firstIndex + op.find.length);
    results.push({ index: i, status: "ok" });
  }

  const applied = results.filter((r) => r.status === "ok").length;

  if (applied === 0) {
    return Response.json({ applied: 0, operations: results }, { status: 422 });
  }

  let sanitized: string;
  try {
    sanitized = await sanitizeMarkdown(content);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
  const hash = await contentHash(sanitized);

  if (current.content_hash === hash) {
    return Response.json({ applied: 0, operations: results, status: "unchanged" });
  }

  const versionId = nanoid(16);
  const editedVia = request.headers.get("x-edited-via") || "api";
  const editedBy = body.author || request.headers.get("x-author") || "Anonymous";

  await db.batch([
    db
      .prepare(
        `INSERT INTO versions (id, document_id, content, content_hash, edited_via, edited_by)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(versionId, id, current.content, current.content_hash, editedVia, editedBy),
    db
      .prepare(
        `UPDATE documents SET content = ?, content_hash = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(sanitized, hash, id),
  ]);

  const headingMatch = sanitized.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    await db
      .prepare("UPDATE documents SET title = ? WHERE id = ?")
      .bind(headingMatch[1].trim(), id)
      .run();
  }

  await broadcastUpdate(id, sanitized, hash);

  return Response.json({ applied, operations: results, content_hash: hash });
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const id = params.id!;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDB();
  const resolved = await resolveToken(db, key);
  if (!resolved || resolved.documentId !== id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (resolved.permission !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.prepare("DELETE FROM documents WHERE id = ?").bind(id).run();

  return Response.json({ status: "deleted" });
};
