/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import tsconfigPaths from "vite-tsconfig-paths";

const r = (...args: string[]) => resolve(__dirname, ...args);

const minify = process.env.NODE_ENV === "production" ? "esbuild" : false;
const cssMinify = process.env.NODE_ENV === "production" ? "esbuild" : false;

// https://vitejs.dev/config/
export default defineConfig({
  root: r("src"),
  publicDir: r("public"),
  build: {
    target: "ES2023",
    cssMinify,
    minify,
    rollupOptions: {
      input: {
        background: r("src", "background", "background.ts"),
        options: r("src", "options", "options.html"),
        popup: r("src", "popup", "popup.html"),
      },
      output: {
        dir: r("dist"),
        entryFileNames: "js/[name].js",
        chunkFileNames: "js/[name].js",
        assetFileNames: "media/[name].[ext]",
      },
    },
  },
  plugins: [react(), nodePolyfills(), tsconfigPaths()],
  test: {
    root: r("."),
    environment: "jsdom",
    globals: true,
    setupFiles: [r("test", "setupTests.ts")],
    coverage: {
      reporter: ["text", "json", "json-summary", "html"],
      reportsDirectory: r("coverage"),
    },
    chaiConfig: {
      truncateThreshold: 0,
    },
  },
});
