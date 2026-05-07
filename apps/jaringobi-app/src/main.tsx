import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';

// BrowserRouter — Vercel 의 vercel.json rewrites 가 모든 경로를 index.html 로
// 보내주므로 SPA 폴백 안전. /admin 같은 깔끔한 URL 사용 가능.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
