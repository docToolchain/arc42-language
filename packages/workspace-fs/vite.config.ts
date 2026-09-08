import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: { entry: "src/index.ts", dts: true },
  lint: { options: { typeAware: false, typeCheck: false } },
  fmt: {},
});
