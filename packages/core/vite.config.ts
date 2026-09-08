import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
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
