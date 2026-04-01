import { DOCS_MARKDOWN } from "@/lib/docs-content";

export async function GET() {
  return new Response(DOCS_MARKDOWN, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
