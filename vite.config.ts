import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import netlify from "@netlify/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    netlify(),
    tanstackStart(),
    viteReact(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      filename: "sw.js",
      manifest: false,
      devOptions: { enabled: false },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/\.netlify\/functions\//],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
      },
    }),
  ],
});
