import type { APIRoute } from "astro";
import { DOCS_MARKDOWN } from "../../../lib/docs-content";

export const prerender = true;

export const GET: APIRoute = () => {
  return new Response(DOCS_MARKDOWN, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
