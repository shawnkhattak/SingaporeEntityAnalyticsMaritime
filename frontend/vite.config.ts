import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    // Host-mounted source via Docker bind mount on macOS — native FS events
    // don't propagate, so fall back to polling.
    watch: { usePolling: true, interval: 400 },
  },
});
