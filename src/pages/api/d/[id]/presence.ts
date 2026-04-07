import type { APIRoute } from "astro";
import { getDB } from "../../../../../lib/db";
import { resolveToken } from "../../../../../lib/permissions";
import { heartbeat, getPresence } from "../../../../../lib/presence";

export const prerender = false;

export const POST: APIRoute = async ({ request, params }) => {
  const id = params.id!;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) return Response.json({ error: "Not found" }, { status: 404 });

  const db = getDB();
  const resolved = await resolveToken(db, key);
  if (!resolved || resolved.documentId !== id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as { session_id: string; name: string };
  if (!body.session_id) {
    return Response.json({ error: "session_id required" }, { status: 400 });
  }

  heartbeat(id, body.session_id, body.name || "Anonymous");

  const viewers = getPresence(id);
  return Response.json({ viewers, count: viewers.length });
};

export const GET: APIRoute = async ({ request, params }) => {
  const id = params.id!;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) return Response.json({ error: "Not found" }, { status: 404 });

  const db = getDB();
  const resolved = await resolveToken(db, key);
  if (!resolved || resolved.documentId !== id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const viewers = getPresence(id);
  return Response.json({ viewers, count: viewers.length });
};
