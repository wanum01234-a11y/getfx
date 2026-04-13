import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

export default defineConfig(({ mode }) => {
  const PORT = Number(process.env.PORT) || 5173;
  const BASE_PATH = process.env.BASE_PATH || "/";
  const apiProxyTarget =
    process.env.VITE_API_PROXY_TARGET ||
    (mode === "development" ? "http://localhost:8787" : "https://getfxpro.space");

  if (Number.isNaN(PORT) || PORT <= 0) {
    throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
  }

  return {
    base: BASE_PATH,
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      ...(mode !== "production" && process.env.REPL_ID !== undefined
        ? (() => {
            try {
              const cartographerMod = require("@replit/vite-plugin-cartographer") as {
                cartographer: (opts: { root: string }) => PluginOption;
              };
              const devBannerMod = require("@replit/vite-plugin-dev-banner") as {
                devBanner: () => PluginOption;
              };
              return [
                cartographerMod.cartographer({ root: path.resolve(import.meta.dirname, "..") }),
                devBannerMod.devBanner(),
              ];
            } catch {
              return [];
            }
          })()
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port: PORT,
      host: "0.0.0.0",
      strictPort: true,
      allowedHosts: true,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
    preview: {
      port: PORT,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
