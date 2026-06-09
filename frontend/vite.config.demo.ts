import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "./api": resolve(__dirname, "src/api-demo.ts"),
      "../api": resolve(__dirname, "src/api-demo.ts"),
      "../../api": resolve(__dirname, "src/api-demo.ts"),
    },
  },
  build: {
    outDir: resolve(__dirname, "../demo"),
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
