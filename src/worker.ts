// Minimal worker entry to test Astro builds
import { handle } from "@astrojs/cloudflare/handler";

export default {
  async fetch(
    request: Request,
    env: Record<string, unknown>,
    ctx: ExecutionContext
  ): Promise<Response> {
    return handle(request, env, ctx);
  },
};
