import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  root: resolve(import.meta.dirname),
  build: {
    // Output to packages/web/dist/ — vite build runs before vp pack, and vp pack's
    // copy rule copies packages/web/dist/** into cli/dist/web/.
    outDir: resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3142",
    },
  },
});
