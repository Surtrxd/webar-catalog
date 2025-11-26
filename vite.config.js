import { defineConfig } from "vite";

export default defineConfig({
  root: ".",       // корень проекта
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true
  },
  server: {
    port: 5173
  },
  preview: {
    port: 10000
  }
});
