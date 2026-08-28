import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { host: "0.0.0.0", port: 4300, strictPort: true },
  preview: { host: "0.0.0.0", port: 4300, strictPort: true },
});
