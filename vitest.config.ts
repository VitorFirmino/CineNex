import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "src/components"),
      "@features": path.resolve(__dirname, "src/features"),
      "@hooks": path.resolve(__dirname, "src/hooks"),
      "@infrastructure": path.resolve(__dirname, "src/infrastructure"),
      "@services": path.resolve(__dirname, "src/service"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@store": path.resolve(__dirname, "src/store"),
    },
  },
  test: {
    setupFiles: ["./src/shared/testing/vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src/**/*.e2e.spec.ts"],
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
    },
  },
});
