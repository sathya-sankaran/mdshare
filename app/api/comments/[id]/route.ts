import { NextRequest } from "next/server";
import { getDB } from "@/lib/db";
import { resolveToken, canPerform } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/comments/:id?key=TOKEN — Resolve or edit a comment.
 * Requires edit or admin key for the comment's document.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: commentId } = await params;
  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDB();

  // Find the comment and its document
  const comment = await db
    .prepare("SELECT document_id FROM comments WHERE id = ?")
    .bind(commentId)
    .first<{ document_id: string }>();

  if (!comment) {
    return Response.json({ error: "Comment not found" }, { status: 404 });
  }

  // Verify permission on the document
  const resolved = await resolveToken(db, key);
  if (!resolved || resolved.documentId !== comment.document_id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (!canPerform(resolved.permission, "edit")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { resolved?: boolean };

  if (body.resolved !== undefined) {
    await db
      .prepare("UPDATE comments SET resolved = ? WHERE id = ?")
      .bind(body.resolved ? 1 : 0, commentId)
      .run();
  }

  return Response.json({ status: "updated" });
}
