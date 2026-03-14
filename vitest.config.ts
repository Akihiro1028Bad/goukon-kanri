import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*.test.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL:
        "postgresql://postgres:postgres@localhost:5433/goukon_kanri_test",
      DIRECT_URL:
        "postgresql://postgres:postgres@localhost:5433/goukon_kanri_test",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
