import { describe, expect, test } from "vite-plus/test";
import { asciidoctorBrowserPaths } from "./vite-asciidoctor.ts";

const ID = "/repo/node_modules/@asciidoctor/core/build/browser/index.js";
const NODE_PATHS = `try {
  LIB_DIR = new URL('.', import.meta.url).pathname;
  ROOT_DIR = new URL('../../', import.meta.url).pathname;
  DATA_DIR = new URL('../../data', import.meta.url).pathname;
} catch {}`;

function transform(code: string, id = ID) {
  const plugin = asciidoctorBrowserPaths();
  return (plugin.transform as (code: string, id: string) => string | undefined)(code, id);
}

describe("asciidoctorBrowserPaths", () => {
  test("adds Vite's opt-out to the three Node.js paths and changes nothing else", () => {
    const patched = transform(`const a = 1;\n${NODE_PATHS}`)!;
    expect(patched).toContain("new URL(/* @vite-ignore */ '.', import.meta.url)");
    expect(patched).toContain("new URL(/* @vite-ignore */ '../../', import.meta.url)");
    expect(patched).toContain("new URL(/* @vite-ignore */ '../../data', import.meta.url)");
    expect(patched.replaceAll("/* @vite-ignore */ ", "")).toBe(`const a = 1;\n${NODE_PATHS}`);
  });

  test("leaves every other module alone", () => {
    expect(transform(NODE_PATHS, "/repo/src/main.ts")).toBeUndefined();
  });

  test("fails when asciidoctor's paths change", () => {
    expect(() => transform("LIB_DIR = new URL('./lib', import.meta.url);")).toThrow(
      /expected exactly .* found new URL\('\.\/lib', import\.meta\.url\)/,
    );
    expect(() => transform("no paths at all")).toThrow(/found none/);
  });
});
