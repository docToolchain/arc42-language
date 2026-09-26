import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { asciidoctorBrowserPaths } from "./vite-asciidoctor.ts";

export default defineConfig({
  plugins: [react(), asciidoctorBrowserPaths()],
  root: resolve(import.meta.dirname),
  // Relative asset URLs: a site built by `arc42 build` works under any subpath,
  // including the lazily loaded chunks (Mermaid) that index.html does not list.
  base: "./",
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
