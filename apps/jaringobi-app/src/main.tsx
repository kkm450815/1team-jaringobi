import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { applyMissionsFromDb, applyTitlesFromDb } from './lib/data';
import { missionsRepo } from './lib/missionsRepo';
import { titlesRepo } from './lib/titlesRepo';
import { installOAuthDeepLinkListener } from './lib/nativeAuth';
import './styles/index.css';

// 안드로이드(Capacitor) Google OAuth 콜백을 위한 딥링크 리스너 등록.
// 웹 환경에선 내부에서 즉시 no-op 처리되므로 호출 안전.
installOAuthDeepLinkListener();

// BrowserRouter — Vercel 의 vercel.json rewrites 가 모든 경로를 index.html 로
// 보내주므로 SPA 폴백 안전. /admin 같은 깔끔한 URL 사용 가능.

// 부팅 시 missions/titles 를 DB 에서 1회 로드해서 lib/data 의 mutable cache 채움.
// 1.5초 안에 안 오면 seed 그대로 렌더 시작 (Supabase 미설정·네트워크 느림 환경 보호).
const BOOT_TIMEOUT_MS = 1500;
const bootData = Promise.race([
  Promise.all([
    missionsRepo.listActive().then(applyMissionsFromDb).catch(() => {}),
    titlesRepo.listActive().then(applyTitlesFromDb).catch(() => {}),
  ]),
  new Promise<void>((resolve) => setTimeout(resolve, BOOT_TIMEOUT_MS)),
]);

bootData.finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
});
