import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const publicSupabaseUrl = (
    env.VITE_SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    "http://127.0.0.1:54321"
  ).replace(/\/$/, "");

  return {
    plugins: [
      {
        name: "public-supabase-html",
        enforce: "pre",
        transformIndexHtml: (html) =>
          html.split("%PUBLIC_SUPABASE_URL%").join(publicSupabaseUrl),
      },
      react(),
      tailwindcss(),
    ],
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: { host: "0.0.0.0", port: 4300, strictPort: true },
    preview: { host: "0.0.0.0", port: 4300, strictPort: true },
  };
});
