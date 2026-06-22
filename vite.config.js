import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // ローカルネットワーク上の他端末（スマホ等）からもアクセス可能にする
    port: 5173,
  },
});
