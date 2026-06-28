/**
 * OmniQ admin panel - Vite configuration.
 * Author: OmniQ Team
 */
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
});
