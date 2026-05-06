import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [react(), tailwind()],
  outDir: "../backend/static",
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
