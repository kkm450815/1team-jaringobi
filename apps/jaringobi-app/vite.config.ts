import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// img/ 자료를 그대로 publicDir로 사용 → /jarin/..., /shop/..., /fit/... 으로 접근
// base: 웹 배포(Vercel)는 '/', 안드로이드 Capacitor 빌드 시 './' 로 — file:// 로
// 로드되는 webview 에서 절대 경로(/assets/...) 가 root 를 못 잡아 흰 화면 되는 문제 회피.
// 환경변수 VITE_CAPACITOR=1 로 빌드 시 상대 경로.
export default defineConfig(({ mode }) => {
  const isCapacitor = process.env.VITE_CAPACITOR === '1' || mode === 'capacitor';
  return {
    base: isCapacitor ? './' : '/',
    plugins: [react()],
    publicDir: path.resolve(__dirname, '../../img'),
    server: { host: true, port: 5173 },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
});
