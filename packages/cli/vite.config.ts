import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: "src/cli.ts",
    dts: false,
    // Only clean the CLI bundle itself; dist/web/ is populated by build:web
    // and must survive the clean step so serve can find the SPA assets.
    clean: ["dist/cli.mjs"],
    deps: {
      alwaysBundle: ["@arc42/core"],
    },
    copy: [
      {
        from: "../../packages/skill/SKILL.md",
        to: "dist/skill",
        flatten: true,
      },
      {
        from: "../../templates/starter/*.arc42.md",
        to: "dist/templates",
        flatten: true,
      },
      // Copy SPA assets from src/web/dist/ into dist/web/.
      // The glob matches individual files; flatten: false preserves the
      // assets/ subdirectory alongside index.html.
      {
        from: "src/web/dist/index.html",
        to: "dist/web",
        flatten: true,
      },
      {
        from: "src/web/dist/assets/*",
        to: "dist/web/assets",
        flatten: true,
      },
    ],
  },
  lint: {
    options: {
      typeAware: false,
      typeCheck: false,
    },
  },
  fmt: {},
});
