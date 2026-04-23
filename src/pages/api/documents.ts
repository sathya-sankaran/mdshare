import type { APIRoute } from "astro";
import { nanoid } from "nanoid";
import { getDB } from "../../../lib/db";
import { generateToken, hashToken, tokenPrefix } from "../../../lib/tokens";
import { sanitizeMarkdown, contentHash, validateIsText } from "../../../lib/sanitize";
import { checkRateLimit, rateLimitResponse } from "../../../lib/rate-limit";
import { incrementStat } from "../../../lib/stats";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const t0 = Date.now();
  const ip = request.headers.get("cf-connecting-ip") || "unknown";

  const burstLimit = checkRateLimit(ip, "create", { max: 10, windowSec: 60 });
  if (!burstLimit.allowed) return rateLimitResponse(burstLimit);

  const dailyLimit = checkRateLimit(ip, "create-daily", { max: 50, windowSec: 86400 });
  if (!dailyLimit.allowed) {
    return Response.json(
      { error: "Daily document creation limit reached (50 per day). Try again tomorrow." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((dailyLimit.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  const db = getDB();
  let rawContent: string;
  let title = "Untitled";

  const contentType = request.headers.get("content-type") || "";
  const userAgent = request.headers.get("user-agent") || "";
  const origin = request.headers.get("origin") || "";
  const xSource = request.headers.get("x-source") || "";

  // Classify document source. Order matters — first match wins. See
  // supporting-docs/document-source-tracking.md for the full rationale.
  let source: "blank" | "paste" | "upload" | "mcp" | "vscode" | "obsidian" | "api";
  if (contentType.includes("multipart/form-data")) {
    source = "upload";
  } else if (xSource === "blank") {
    source = "blank";
  } else if (/^mdshare-mcp\//i.test(userAgent)) {
    source = "mcp";
  } else if (/mdshare-vscode/i.test(userAgent)) {
    source = "vscode";
  } else if (/mdshare-obsidian|Obsidian/i.test(userAgent)) {
    source = "obsidian";
  } else if (/^https?:\/\/(mdshare\.live|localhost(:\d+)?)$/i.test(origin)) {
    source = "paste";
  } else {
    source = "api";
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const rawBytes = new Uint8Array(await file.arrayBuffer());
    try {
      validateIsText(rawBytes);
    } catch (err) {
      return Response.json({ error: (err as Error).message }, { status: 400 });
    }

    rawContent = new TextDecoder("utf-8").decode(rawBytes);
    title = file.name.replace(/\.mdx?$/, "") || "Untitled";
  } else {
    rawContent = await request.text();
    if (!rawContent.trim()) {
      return Response.json({ error: "Empty content" }, { status: 400 });
    }
  }

  const headingMatch = rawContent.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    title = headingMatch[1].trim();
  }

  const tSanitize = Date.now();
  let content: string;
  try {
    content = await sanitizeMarkdown(rawContent);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
  const hash = await contentHash(content);
  const sanitizeMs = Date.now() - tSanitize;

  const docId = nanoid(10);
  const adminToken = generateToken("admin");
  const adminTokenHash = await hashToken(adminToken);
  const adminPrefix = tokenPrefix(adminToken);
  const linkId = nanoid(16);

  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const tDb = Date.now();
  await db.batch([
    db
      .prepare(
        `INSERT INTO documents (id, title, content, content_hash, expires_at, source)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(docId, title, content, hash, expiresAt, source),
    db
      .prepare(
        `INSERT INTO links (id, document_id, token_prefix, token_hash, permission, label, token)
         VALUES (?, ?, ?, ?, 'admin', 'admin', ?)`
      )
      .bind(linkId, docId, adminPrefix, adminTokenHash, adminToken),
  ]);
  await incrementStat(db, "documents_created");
  const dbMs = Date.now() - tDb;

  const baseUrl = new URL(request.url).origin;
  const totalMs = Date.now() - t0;

  return Response.json(
    {
      document_id: docId,
      admin_key: adminToken,
      admin_url: `${baseUrl}/d/${docId}?key=${adminToken}`,
      expires_at: expiresAt,
      processing_ms: totalMs,
      note: "Document expires in 90 days. Share links may have their own expiry.",
    },
    {
      status: 201,
      headers: {
        "Server-Timing": `sanitize;dur=${sanitizeMs}, db;dur=${dbMs}, total;dur=${totalMs}`,
      },
    }
  );
};
