/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const rootDir = import.meta.dirname;

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), solid()],

  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },

  // `@paddleocr/paddleocr-js` is used in main-thread mode (`worker: false`,
  // see `src/lib/localOcr.ts`, matching the official Vite demo
  // `paddleocr-js/apps/demo/src/main.ts`). The worker-entry asset is therefore
  // never instantiated, so the SDK can stay in Vite's default pre-bundling
  // pipeline. That matters because its transitive deps (`clipper-lib`,
  // `@techstark/opencv-js`) ship CJS/UMD without an ESM `default` export —
  // excluding the SDK from optimizeDeps serves it as raw native ESM and the
  // browser fails to link `import X from ...` ("cannot be resolved by star
  // export entries", surfaced on the Splash screen as "Local OCR failed to
  // load"). Letting esbuild pre-bundle it provides the CJS interop.
  worker: {
    format: "es",
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    // Same COOP/COEP headers as the official paddleocr-js Vite demo. They
    // enable `crossOriginIsolated`, which unlocks multi-threaded WASM
    // (`getDemoThreadCount` in `src/lib/localOcr.ts`); without them ORT
    // silently falls back to a single thread.
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },
  preview: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },
  test: {
    globals: true,
    environment: "node",
  },
});
