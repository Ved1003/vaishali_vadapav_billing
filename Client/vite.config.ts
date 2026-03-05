import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // NOTE: base is intentionally NOT set to './' — that was needed for Electron file:// loading.
  // For web hosting (Netlify/Vercel), omit base so all asset paths are absolute.
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Increase chunk size warning threshold (our app is intentionally chunked)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — changes almost never, cached long-term
          "vendor-react": ["react", "react-dom"],
          // Router
          "vendor-router": ["react-router-dom"],
          // Data layer
          "vendor-query": ["@tanstack/react-query"],
          // Animation (large lib, separate chunk so billing can skip loading it)
          "vendor-motion": ["framer-motion"],
          // Icon set
          "vendor-icons": ["lucide-react"],
          // UI primitives
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
          ],
        },
      },
    },
  },
}));

