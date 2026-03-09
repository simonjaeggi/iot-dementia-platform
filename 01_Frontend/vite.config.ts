import { defineConfig, loadEnv, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.BACKEND_URL || "http://localhost:3000";
  const useInternalProxy = env.PROXY_MODE === "INTERNAL";
  const allowedHosts = (env.ALLOWED_HOSTS || "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  const userConfig: UserConfig = {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      allowedHosts,
    },
  };

  if (useInternalProxy) {
    userConfig.server!.proxy = {
      "/api": apiUrl,
    };
  }

  return userConfig;
});
