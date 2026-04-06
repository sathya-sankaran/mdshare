// Custom worker entry point that exports both the OpenNext handler,
// Durable Object class, and scheduled cron handler.

// @ts-ignore - .open-next/worker.js is generated at build time
import { default as handler } from "./.open-next/worker.js";
import { hashToken, tokenPrefix, verifyToken } from "./lib/tokens";

/**
 * Resolve a token directly against D1 (bypasses Next.js/OpenNext).
 * Duplicates lib/permissions.ts logic to avoid framework dependency.
 */
async function resolveTokenDirect(
  db: D1Database,
  token: string
): Promise<{ permission: string; documentId: string } | null> {
  const prefix = tokenPrefix(token);
  const rows = await db
    .prepare(
      `SELECT document_id, token_hash, permission, is_active, expires_at
       FROM links WHERE token_prefix = ?`
    )
    .bind(prefix)
    .all<{
      document_id: string;
      token_hash: string;
      permission: string;
      is_active: number;
      expires_at: string | null;
    }>();

  if (!rows.results?.length) return null;

  for (const row of rows.results) {
    if (!row.is_active) continue;
    if (row.expires_at && new Date(row.expires_at) < new Date()) continue;
    if (await verifyToken(token, row.token_hash)) {
      return { permission: row.permission, documentId: row.document_id };
    }
  }
  return null;
}

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Intercept WebSocket upgrades before they reach OpenNext
    if (
      url.pathname.startsWith("/api/ws/") &&
      request.headers.get("Upgrade") === "websocket"
    ) {
      const id = url.pathname.split("/")[3];
      const key = url.searchParams.get("key");
      if (!id || !key) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }

      const db = env.DB as D1Database;
      const resolved = await resolveTokenDirect(db, key);
      if (!resolved || resolved.documentId !== id) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }

      const doBinding = env.DOCUMENT_WS as DurableObjectNamespace;
      if (!doBinding) {
        return Response.json({ error: "WebSocket not available" }, { status: 503 });
      }

      const doId = doBinding.idFromName(id);
      const stub = doBinding.get(doId);
      const doUrl = new URL(request.url);
      doUrl.searchParams.set("permission", resolved.permission);

      return stub.fetch(doUrl.toString(), {
        headers: request.headers,
      });
    }

    // Everything else goes through OpenNext/Next.js
    return handler.fetch(request, env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: Record<string, unknown>, ctx: ExecutionContext) {
    if (event.cron === "0 3 * * *") {
      // Daily cron: clean up expired documents
      const db = env.DB as D1Database;
      if (!db) return;

      const result = await db
        .prepare("DELETE FROM documents WHERE expires_at IS NOT NULL AND expires_at < datetime('now')")
        .run();

      console.log(`Cron cleanup: deleted ${result.meta?.changes || 0} expired documents`);
    } else {
      // Every 5 minutes: keep worker warm
      console.log("Keep-warm ping");
    }
  },
};

// Export our Durable Object class
export { DocumentWebSocket } from "./worker/document-ws";
