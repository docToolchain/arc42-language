import type { Plugin } from "vite-plus";

/**
 * @asciidoctor/core's browser build computes Node.js-only directories with
 * `new URL('.', import.meta.url)` and two siblings (in a browser they stay
 * unused). Vite turns every such URL into an emitted asset, so the build copied
 * asciidoctor's own 990 KB file twice — and a --single-file page inlined both
 * copies as base64 (+2.6 MB) — without anything ever loading them.
 *
 * This plugin adds Vite's documented opt-out, `/* @vite-ignore *\/`, to exactly
 * those calls: the URLs are left to runtime, as in the original. It fails the
 * build when the calls change, so an asciidoctor upgrade is checked, not
 * silently bloated again.
 */
export function asciidoctorBrowserPaths(): Plugin {
  const NODE_PATHS = [
    "new URL('.', import.meta.url)",
    "new URL('../../', import.meta.url)",
    "new URL('../../data', import.meta.url)",
  ];
  return {
    name: "arc42:asciidoctor-browser-paths",
    enforce: "pre",
    transform(code, id) {
      if (!/[\\/]@asciidoctor[\\/]core[\\/]build[\\/]browser[\\/]index\.js$/.test(id)) return;
      const urls: string[] = code.match(/new URL\([^)]*import\.meta\.url\)/g) ?? [];
      if (urls.length !== NODE_PATHS.length || !NODE_PATHS.every((url) => urls.includes(url))) {
        throw new Error(
          `${id}: expected exactly ${NODE_PATHS.join(", ")}; found ${urls.join(", ") || "none"}. ` +
            "Check whether the new asciidoctor still needs this plugin.",
        );
      }
      return NODE_PATHS.reduce(
        (patched, url) =>
          patched.replace(url, url.replace("new URL(", "new URL(/* @vite-ignore */ ")),
        code,
      );
    },
  };
}
