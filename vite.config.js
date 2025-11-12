import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        about: resolve(__dirname, "about.html"),
        verify: resolve(__dirname, "verify.html"),
        adminLogin: resolve(__dirname, "admin-login.html"),
        admin: resolve(__dirname, "admin.html"),
      },
    },
  },
});
