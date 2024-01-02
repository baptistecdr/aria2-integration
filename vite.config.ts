import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const r = (...args: string[]) => resolve(__dirname, ...args);

// https://vitejs.dev/config/
export default defineConfig({
  root: r("src"),
  publicDir: r("public"),
  build: {
    target: "ES2022",
    rollupOptions: {
      input: {
        background: r("src/background/background.ts"),
        options: r("src/options/options.html"),
        popup: r("src/popup/popup.html"),
      },
      output: {
        dir: r("dist"),
        entryFileNames: `js/[name].js`,
        chunkFileNames: `js/[name].js`,
        assetFileNames: `media/[name].[ext]`,
      },
    },
  },
  plugins: [react(), nodePolyfills()],
});
