/// <reference types="vitest/config" />
import { execSync } from "node:child_process";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";

const r = (...args: string[]) => resolve(__dirname, ...args);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, r("."), "");
  const isDebug = mode.endsWith("-debug");

  return {
    root: r("src"),
    publicDir: r("public"),
    resolve: {
      tsconfigPaths: true,
    },
    build: {
      target: "es2023",
      cssMinify: isDebug ? false : "lightningcss",
      minify: isDebug ? false : "oxc",
      sourcemap: mode.endsWith("-debug"),
      rolldownOptions: {
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
    plugins: [
      react(),
      {
        name: "generate-manifest",
        closeBundle() {
          if (process.env.VITEST) return;
          execSync("node scripts/generate-manifest.js", { stdio: "inherit", env: { ...process.env, ...env } });
        },
      },
    ],
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
  };
});
