import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        about: resolve(__dirname, "about.html"),
        verify: resolve(__dirname, "verify.html"),
        menu: resolve(__dirname, "menu.html"),
      },
    },
  },
});
