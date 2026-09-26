import { readFileSync } from "node:fs";
import { defineConfig } from "vite-plus";

// Build one entry per subpath export, taken from package.json, so every export points to a
// built file. Consumers that bundle the built package (the CLI) cannot resolve an export
// whose file was never built.
const { exports } = JSON.parse(readFileSync(new URL("package.json", import.meta.url), "utf8")) as {
  exports: Record<string, string | { development?: string }>;
};
const entry = Object.values(exports).flatMap((target) =>
  typeof target === "object" && target.development ? [target.development] : [],
);

export default defineConfig({
  pack: {
    entry,
    dts: true,
    exports: false,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
