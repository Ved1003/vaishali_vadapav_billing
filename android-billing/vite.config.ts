import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        outDir: "dist",
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks: {
                    "vendor-react": ["react", "react-dom"],
                    "vendor-router": ["react-router-dom"],
                    "vendor-query": ["@tanstack/react-query"],
                    "vendor-motion": ["framer-motion"],
                    "vendor-icons": ["lucide-react"],
                },
            },
        },
    },
    server: {
        host: true,
        port: 5174,
    },
});
