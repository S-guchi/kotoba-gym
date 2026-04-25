import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@kotoba-gym/core": resolve(__dirname, "packages/core/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["apps/**/*.{test,spec}.ts", "packages/**/*.{test,spec}.ts"],
    exclude: ["**/dist/**", "**/node_modules/**", "**/.expo/**"],
  },
});
