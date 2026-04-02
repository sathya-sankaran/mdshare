import { NextRequest } from "next/server";
import { getDB } from "./db";
import { resolveToken, canPerform } from "./permissions";
import type { ResolvedPermission } from "./permissions";
import type { Permission } from "./tokens";

interface ValidatedRequest {
  resolved: ResolvedPermission;
  db: D1Database;
}

/**
 * Validate a request has a valid token for the given document.
 * Returns the resolved permission or a 404 Response.
 */
export async function validateDocumentAccess(
  request: NextRequest,
  documentId: string
): Promise<ValidatedRequest | Response> {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDB();
  const resolved = await resolveToken(db, key);
  if (!resolved || resolved.documentId !== documentId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return { resolved, db };
}

/**
 * Check if the result is an error Response.
 */
export function isErrorResponse(result: ValidatedRequest | Response): result is Response {
  return result instanceof Response;
}

/**
 * Validate and require a minimum permission level.
 */
export async function validateWithPermission(
  request: NextRequest,
  documentId: string,
  minPermission: Permission
): Promise<ValidatedRequest | Response> {
  const result = await validateDocumentAccess(request, documentId);
  if (isErrorResponse(result)) return result;

  if (!canPerform(result.resolved.permission, minPermission)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return result;
}
