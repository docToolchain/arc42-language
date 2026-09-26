import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "path";
import type { Plugin } from "vite-plus";
import { asciidoctorBrowserPaths } from "./vite-asciidoctor.ts";

/**
 * The HTML parser stops parsing a <script> block when it encounters a bare
 * `<script` token inside the script content — even inside JS string literals.
 * vite-plugin-singlefile escapes `</script` → `\x3C/script` but leaves
 * opening `<script` unescaped inside inlined JS.
 *
 * This plugin runs in generateBundle after singlefile has written the inlined
 * HTML into the bundle, and escapes any remaining `<script` tokens inside
 * <script> block bodies.
 */
function escapeInlineScriptTags(): Plugin {
  return {
    name: "escape-inline-script-tags",
    enforce: "post",
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== "asset" || !file.fileName.endsWith(".html")) continue;

        let html = file.source as string;

        // Replace <script (inside script block bodies) with \x3Cscript.
        // We process block by block to avoid touching the actual
        // opening/closing script tags.
        let result = "";
        let pos = 0;
        while (pos < html.length) {
          const scriptOpen = html.indexOf("<script", pos);
          if (scriptOpen === -1) {
            result += html.slice(pos);
            break;
          }
          // Copy up to and including this opening tag
          const tagEnd = html.indexOf(">", scriptOpen);
          if (tagEnd === -1) {
            result += html.slice(pos);
            break;
          }
          const openingTag = html.slice(scriptOpen, tagEnd + 1);
          result += html.slice(pos, scriptOpen) + openingTag;
          pos = tagEnd + 1;

          // Find matching </script>
          const closeTag = html.indexOf("</script>", pos);
          if (closeTag === -1) {
            result += html.slice(pos);
            break;
          }
          // Escape any <script inside the body (but not \x3Cscript — already escaped)
          const body = html.slice(pos, closeTag);
          result += body.replace(/<script/gi, "\\x3Cscript") + "</script>";
          pos = closeTag + "</script>".length;
        }

        file.source = result;
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), asciidoctorBrowserPaths(), viteSingleFile(), escapeInlineScriptTags()],
  root: resolve(import.meta.dirname),
  build: {
    outDir: resolve(import.meta.dirname, "dist-single"),
    emptyOutDir: true,
  },
});
