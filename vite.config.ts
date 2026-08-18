import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: process.env.ELECTRON === 'true' ? './' : '/',
  define: {
    // Injected at build time — used by the Android updater to compare against GitHub release date
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    host: "::",
    port: 8080,
    historyApiFallback: true,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
