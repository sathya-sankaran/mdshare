import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { getDB } from "@/lib/db";
import type { LinkRow } from "@/lib/db";
import { resolveToken } from "@/lib/permissions";
import { generateToken, hashToken, tokenPrefix } from "@/lib/tokens";
import type { Permission } from "@/lib/tokens";
import { incrementStat } from "@/lib/stats";

export const dynamic = "force-dynamic";

const VALID_PERMISSIONS: Permission[] = ["view", "edit", "comment"];

/**
 * POST /api/d/:id/links?key=TOKEN — Generate a new share link.
 * Admin only.
 */
export async function POST(
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
  if (!resolved || resolved.documentId !== id || resolved.permission !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { permission: string; label?: string; expires_at?: string | null };
  const permission = body.permission as Permission;
  const label = body.label || null;
  const expiresAt = body.expires_at || null;

  if (!VALID_PERMISSIONS.includes(permission)) {
    return Response.json(
      { error: `Invalid permission. Must be one of: ${VALID_PERMISSIONS.join(", ")}` },
      { status: 400 }
    );
  }

  // Enforce 50-link limit per document (excludes admin link)
  const linkCount50 = await db
    .prepare("SELECT COUNT(*) as cnt FROM links WHERE document_id = ? AND permission != 'admin'")
    .bind(id)
    .first<{ cnt: number }>();
  if (linkCount50 && linkCount50.cnt >= 50) {
    return Response.json(
      { error: "Link limit reached. Maximum 50 share links per document." },
      { status: 400 }
    );
  }

  const token = generateToken(permission);
  const hash = await hashToken(token);
  const prefix = tokenPrefix(token);
  const linkId = nanoid(16);

  await db
    .prepare(
      `INSERT INTO links (id, document_id, token_prefix, token_hash, permission, label, token, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(linkId, id, prefix, hash, permission, label, token, expiresAt)
    .run();

  // Count as "shared" if this is the first non-admin link for this doc
  const linkCount = await db
    .prepare("SELECT COUNT(*) as cnt FROM links WHERE document_id = ? AND permission != 'admin'")
    .bind(id)
    .first<{ cnt: number }>();
  if (linkCount && linkCount.cnt === 1) {
    await incrementStat(db, "documents_shared");
  }

  const baseUrl = new URL(request.url).origin;

  return Response.json(
    {
      token,
      url: `${baseUrl}/d/${id}?key=${token}`,
      permission,
      label,
    },
    { status: 201 }
  );
}

/**
 * GET /api/d/:id/links?key=TOKEN — List all links for a document.
 * Admin only.
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
  if (!resolved || resolved.documentId !== id || resolved.permission !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const baseUrl = new URL(request.url).origin;

  const links = await db
    .prepare(
      `SELECT id, permission, label, is_active, expires_at, created_at, token
       FROM links
       WHERE document_id = ? AND permission != 'admin'
       ORDER BY created_at DESC`
    )
    .bind(id)
    .all<{
      id: string;
      permission: string;
      label: string | null;
      is_active: number;
      expires_at: string | null;
      created_at: string;
      token: string | null;
    }>();

  // Build URLs from stored tokens
  const linksWithUrls = (links.results || []).map((link) => ({
    ...link,
    url: link.token ? `${baseUrl}/d/${id}?key=${link.token}` : null,
  }));

  return Response.json({ links: linksWithUrls });
}
