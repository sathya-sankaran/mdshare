import type { APIRoute } from "astro";
import { getDB } from "../../../lib/db";
import { getStats } from "../../../lib/stats";

export const prerender = false;

export const GET: APIRoute = async () => {
  const db = getDB();
  const stats = await getStats(db);

  return Response.json(stats, {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
};
