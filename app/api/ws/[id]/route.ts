import { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDB } from "@/lib/db";
import { resolveToken } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/ws/:id?key=TOKEN — WebSocket upgrade endpoint.
 * Validates the token, then routes to the Durable Object for this document.
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

  // Verify the token
  const db = getDB();
  const resolved = await resolveToken(db, key);
  if (!resolved || resolved.documentId !== id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Check for WebSocket upgrade
  if (request.headers.get("Upgrade") !== "websocket") {
    return Response.json({ error: "Expected WebSocket upgrade" }, { status: 426 });
  }

  // Get the Durable Object stub for this document
  const { env } = getCloudflareContext();
  const doBinding = (env as Record<string, any>).DOCUMENT_WS as DurableObjectNamespace;

  if (!doBinding) {
    return Response.json({ error: "WebSocket not available" }, { status: 503 });
  }

  // Use the document ID as the DO name (one DO per document)
  const doId = doBinding.idFromName(id);
  const stub = doBinding.get(doId);

  // Forward the upgrade request to the DO with permission info
  const doUrl = new URL(request.url);
  doUrl.searchParams.set("permission", resolved.permission);

  return stub.fetch(doUrl.toString(), {
    headers: request.headers,
  });
}
