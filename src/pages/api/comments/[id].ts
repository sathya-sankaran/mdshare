import type { APIRoute } from "astro";
import { getDB } from "../../../../lib/db";
import { resolveToken, canPerform } from "../../../../lib/permissions";

export const prerender = false;

export const PATCH: APIRoute = async ({ request, params }) => {
  const commentId = params.id!;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDB();

  const comment = await db
    .prepare("SELECT document_id FROM comments WHERE id = ?")
    .bind(commentId)
    .first<{ document_id: string }>();

  if (!comment) {
    return Response.json({ error: "Comment not found" }, { status: 404 });
  }

  const resolved = await resolveToken(db, key);
  if (!resolved || resolved.documentId !== comment.document_id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (!canPerform(resolved.permission, "edit")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { resolved?: boolean };

  if (body.resolved !== undefined) {
    const resolvedVal = body.resolved ? 1 : 0;
    await db.batch([
      db.prepare("UPDATE comments SET resolved = ? WHERE id = ?").bind(resolvedVal, commentId),
      db.prepare("UPDATE comments SET resolved = ? WHERE parent_id = ?").bind(resolvedVal, commentId),
    ]);
  }

  return Response.json({ status: "updated" });
};
