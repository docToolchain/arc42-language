import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  run: {
    cache: true,
  },
  test: {
    // Exclude Playwright test files — they run via `playwright test`, not vitest.
    // The root vp test command picks up all *.spec.ts files recursively, but
    // Playwright specs import from @playwright/test which is incompatible with
    // the vitest runtime.
    exclude: ["**/node_modules/**", "**/dist/**", "**/packages/web/tests/**"],
  },
});
