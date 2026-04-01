import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { getDB } from "@/lib/db";
import { generateToken, hashToken, tokenPrefix } from "@/lib/tokens";
import { sanitizeMarkdown, contentHash, validateIsText } from "@/lib/sanitize";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/documents — Create a new document.
 * Accepts: text/markdown body or multipart form-data with file field.
 * Returns: admin key + admin URL.
 * Rate limited: 10 creates per minute per IP.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const limit = checkRateLimit(ip, "create", { max: 10, windowSec: 60 });
  if (!limit.allowed) return rateLimitResponse(limit);

  const db = getDB();
  let rawContent: string;
  let title = "Untitled";

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate raw bytes BEFORE text conversion
    const rawBytes = new Uint8Array(await file.arrayBuffer());
    try {
      validateIsText(rawBytes);
    } catch (err) {
      return Response.json(
        { error: (err as Error).message },
        { status: 400 }
      );
    }

    rawContent = new TextDecoder("utf-8").decode(rawBytes);
    title = file.name.replace(/\.mdx?$/, "") || "Untitled";
  } else {
    rawContent = await request.text();
    if (!rawContent.trim()) {
      return Response.json(
        { error: "Empty content" },
        { status: 400 }
      );
    }
  }

  // Extract title from first heading if present
  const headingMatch = rawContent.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    title = headingMatch[1].trim();
  }

  // Sanitize content (also runs validateIsText for non-multipart uploads)
  let content: string;
  try {
    content = await sanitizeMarkdown(rawContent);
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
  const hash = await contentHash(content);

  // Generate document ID and admin token
  const docId = nanoid(10);
  const adminToken = generateToken("admin");
  const adminTokenHash = await hashToken(adminToken);
  const adminPrefix = tokenPrefix(adminToken);
  const linkId = nanoid(16);

  // Insert document
  await db
    .prepare(
      `INSERT INTO documents (id, title, content, content_hash)
       VALUES (?, ?, ?, ?)`
    )
    .bind(docId, title, content, hash)
    .run();

  // Insert admin link (store raw token so admin can always retrieve URLs)
  await db
    .prepare(
      `INSERT INTO links (id, document_id, token_prefix, token_hash, permission, label, token)
       VALUES (?, ?, ?, ?, 'admin', 'admin', ?)`
    )
    .bind(linkId, docId, adminPrefix, adminTokenHash, adminToken)
    .run();

  const baseUrl = new URL(request.url).origin;

  return Response.json(
    {
      document_id: docId,
      admin_key: adminToken,
      admin_url: `${baseUrl}/d/${docId}?key=${adminToken}`,
    },
    { status: 201 }
  );
}
