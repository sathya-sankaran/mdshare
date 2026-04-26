import { env } from "cloudflare:workers";

/**
 * Broadcast a document update to all connected WebSocket clients
 * via the Durable Object. Called after API writes (PUT, PATCH).
 */
export async function broadcastUpdate(
  documentId: string,
  content: string,
  contentHash: string
): Promise<void> {
  try {
    const doBinding = (env as Record<string, any>).DOCUMENT_WS as DurableObjectNamespace;
    if (!doBinding) return;

    const doId = doBinding.idFromName(documentId);
    const stub = doBinding.get(doId);

    await stub.fetch("https://internal/broadcast", {
      method: "POST",
      body: JSON.stringify({
        type: "update",
        content,
        content_hash: contentHash,
      }),
    });
  } catch {
    // Non-critical — if broadcast fails, polling will catch up
  }
}
