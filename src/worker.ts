// Custom worker entry point for Astro 5 + Cloudflare Workers
// Handles: Astro pages/API, WebSocket upgrades, Durable Objects, Cron

import type { SSRManifest } from "astro";
import { App } from "astro/app";
import { handle } from "@astrojs/cloudflare/handler";
import { tokenPrefix, verifyToken } from "../lib/tokens";

type IncomingRequest = Parameters<ExportedHandlerFetchHandler>[0];

// Re-export the Durable Object class
import { DocumentWebSocket } from "../worker/document-ws";
export { DocumentWebSocket };

interface Env {
  DB: D1Database;
  DOCUMENT_WS: DurableObjectNamespace;
  ASSETS: Fetcher;
  [key: string]: unknown;
}

/**
 * Resolve a token directly against D1 (bypasses Astro routing).
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

export function createExports(manifest: SSRManifest) {
  const app = new App(manifest);
  return {
    default: {
      async fetch(
        request: IncomingRequest,
        env: Env,
        ctx: ExecutionContext
      ): Promise<Response> {
        const url = new URL(request.url);

        // Intercept WebSocket upgrades before they reach Astro
        if (
          url.pathname.startsWith("/api/ws/") &&
          request.headers.get("Upgrade") === "websocket"
        ) {
          try {
            const id = url.pathname.split("/")[3];
            const key = url.searchParams.get("key");
            if (!id || !key) {
              return Response.json({ error: "Not found" }, { status: 404 });
            }

            const resolved = await resolveTokenDirect(env.DB, key);
            if (!resolved || resolved.documentId !== id) {
              return Response.json({ error: "Not found" }, { status: 404 });
            }

            const doBinding = env.DOCUMENT_WS;
            if (!doBinding) {
              return Response.json(
                { error: "WebSocket not available" },
                { status: 503 }
              );
            }

            const doId = doBinding.idFromName(id);
            const stub = doBinding.get(doId);
            const doUrl = new URL(request.url);
            doUrl.searchParams.set("permission", resolved.permission);

            return await stub.fetch(doUrl.toString(), {
              headers: request.headers,
            });
          } catch (err) {
            console.error("WS upgrade failed", {
              url: request.url,
              path: url.pathname,
              colo: (request as IncomingRequest).cf?.colo,
              error:
                err instanceof Error
                  ? { name: err.name, message: err.message, stack: err.stack }
                  : String(err),
            });
            throw err;
          }
        }

        // Everything else goes through Astro
        let response: Response;
        try {
          response = await handle(manifest, app, request, env, ctx);
        } catch (err) {
          console.error("Astro handler failed", {
            url: request.url,
            method: request.method,
            error:
              err instanceof Error
                ? { name: err.name, message: err.message, stack: err.stack }
                : String(err),
          });
          throw err;
        }

        // Add security headers
        const headers = new Headers(response.headers);
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("X-Frame-Options", "DENY");
        headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
        headers.set(
          "Permissions-Policy",
          "camera=(), microphone=(), geolocation=()"
        );
        headers.set(
          "Content-Security-Policy",
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' https: data:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' wss: https:; frame-ancestors 'none'"
        );

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      },

      async scheduled(
        _controller: ScheduledController,
        env: Env,
        _ctx: ExecutionContext
      ) {
        // Daily cron: clean up expired documents
        const result = await env.DB
          .prepare(
            "DELETE FROM documents WHERE expires_at IS NOT NULL AND expires_at < datetime('now')"
          )
          .run();
        console.warn(
          `Cron cleanup: deleted ${result.meta?.changes || 0} expired documents`
        );
      },
    } satisfies ExportedHandler<Env>,
    DocumentWebSocket,
  };
}
