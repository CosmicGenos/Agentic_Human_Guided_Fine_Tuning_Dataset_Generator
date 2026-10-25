import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    // 5173 (Vite's default) sits inside a Windows-reserved range (5080-5179),
    // which fails with EACCES. Keep in sync with CORS_ORIGINS / HOST_URL.
    host: 'localhost',
    port: 5200,
    strictPort: true,
  },
});
