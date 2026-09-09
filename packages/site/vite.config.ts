import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { verdictsPlugin } from "./src/vite-plugin-verdicts";

export default defineConfig({
  plugins: [react(), verdictsPlugin(resolve(import.meta.dirname, "../../docs/verdicts"))],
  root: resolve(import.meta.dirname),
  build: {
    outDir: resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
  },
});
