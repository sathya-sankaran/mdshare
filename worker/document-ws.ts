import { DurableObject } from "cloudflare:workers";

/**
 * Durable Object that manages WebSocket connections for a single document.
 * Uses the Hibernation API to sleep when no clients are connected (free tier friendly).
 */
export class DocumentWebSocket extends DurableObject {
  private connections = new Set<WebSocket>();

  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);

      // Non-WebSocket: broadcast an update to all connected clients (called by API routes)
      if (request.headers.get("Upgrade") !== "websocket") {
        if (request.method === "POST" && url.pathname.endsWith("/broadcast")) {
          const data = await request.text();
          for (const conn of this.ctx.getWebSockets()) {
            if (conn.readyState === WebSocket.OPEN) {
              conn.send(data);
            }
          }
          return new Response("ok");
        }
        return new Response("Expected WebSocket", { status: 426 });
      }

      const permission = url.searchParams.get("permission") || "view";

      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];

      // Accept with hibernation
      this.ctx.acceptWebSocket(server, [permission]);
      this.connections.add(server);

      return new Response(null, { status: 101, webSocket: client });
    } catch (err) {
      console.error("DocumentWebSocket.fetch failed", {
        url: request.url,
        method: request.method,
        upgrade: request.headers.get("Upgrade"),
        error:
          err instanceof Error
            ? { name: err.name, message: err.message, stack: err.stack }
            : String(err),
      });
      throw err;
    }
  }

  /**
   * Called when a WebSocket receives a message.
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;

    try {
      const data = JSON.parse(message);

      if (data.type === "update") {
        // Broadcast to all OTHER connected clients
        for (const conn of this.ctx.getWebSockets()) {
          if (conn !== ws && conn.readyState === WebSocket.OPEN) {
            conn.send(message);
          }
        }
      }

      if (data.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    } catch {
      // Ignore invalid JSON
    }
  }

  /**
   * Called when a WebSocket is closed.
   */
  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
    this.connections.delete(ws);
    this.broadcastPresence();
  }

  /**
   * Called when a WebSocket errors.
   */
  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    this.connections.delete(ws);
  }

  private broadcastPresence() {
    const count = this.ctx.getWebSockets().length;
    const msg = JSON.stringify({ type: "presence", count });
    for (const conn of this.ctx.getWebSockets()) {
      if (conn.readyState === WebSocket.OPEN) {
        conn.send(msg);
      }
    }
  }
}
