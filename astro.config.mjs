import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  trailingSlash: "never",
  build: {
    format: "file",
  },
  security: {
    checkOrigin: false,
  },
  integrations: [react()],
  vite: {
    css: {
      postcss: "./postcss.config.mjs",
    },
    ssr: {
      optimizeDeps: {
        include: ["astro > picomatch"],
      },
    },
    build: {
      rollupOptions: {
        external: ["next", "next/server", "next/font/google", "next/navigation", "@opennextjs/cloudflare"],
      },
    },
  },
});
