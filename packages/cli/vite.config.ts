import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: "src/cli.ts",
    dts: false,
    exports: true,
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
    ],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
