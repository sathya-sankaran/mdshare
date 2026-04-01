import { DurableObject } from "cloudflare:workers";

interface WebSocketAttachment {
  permission: string;
}

/**
 * Durable Object that manages WebSocket connections for a single document.
 * Uses the Hibernation API to sleep when no clients are connected (free tier friendly).
 */
export class DocumentWebSocket extends DurableObject {
  private connections = new Set<WebSocket>();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Only handle WebSocket upgrades
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const permission = url.searchParams.get("permission") || "view";

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    // Accept with hibernation
    this.ctx.acceptWebSocket(server, [permission]);
    this.connections.add(server);

    return new Response(null, { status: 101, webSocket: client });
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
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    this.connections.delete(ws);
    this.broadcastPresence();
  }

  /**
   * Called when a WebSocket errors.
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
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
