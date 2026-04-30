import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// img/ 자료를 그대로 publicDir로 사용 → /jarin/..., /shop/..., /fit/... 으로 접근
export default defineConfig({
  plugins: [react()],
  publicDir: path.resolve(__dirname, '../../img'),
  server: { host: true, port: 5173 },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
