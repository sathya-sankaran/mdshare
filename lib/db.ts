import { env } from "cloudflare:workers";

export function getDB(): D1Database {
  return (env as { DB: D1Database }).DB;
}

export type { DocumentRow, LinkRow, CommentRow, VersionRow } from "./db-types";
