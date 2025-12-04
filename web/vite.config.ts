import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom", "@emotion/react", "@emotion/styled"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@emotion/react", "@emotion/styled"],
  },
  server: { port: 5173 },
});
