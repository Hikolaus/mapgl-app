import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/mapgl-app/",
  plugins: [react()],
});
