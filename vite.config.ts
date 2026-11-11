import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://fesqueira.github.io/pix-facil/ on GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? "/pix-facil/" : "/",
});
