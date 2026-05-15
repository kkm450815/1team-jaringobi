// Capacitor 안드로이드에서 Google OAuth 를 외부 브라우저(Chrome Custom Tabs)로
// 처리하기 위한 헬퍼. Google 은 보안상 임베디드 WebView 에서 OAuth 를 차단하므로
// (https://developers.google.com/identity/protocols/oauth2/policies)
// 앱 내부 WebView 가 직접 accounts.google.com 으로 가면 "이 브라우저는 안전하지
// 않습니다" 에러로 실패함 — 그래서 별도 OS 브라우저로 우회.
//
// 흐름:
//   1) 사용자가 "Google 로그인" 클릭
//   2) Supabase 로부터 OAuth URL 받아 (skipBrowserRedirect=true)
//   3) Browser.open() 으로 Chrome Custom Tabs 띄움
//   4) 사용자가 구글 계정 인증
//   5) Google → Supabase callback → jaringobi.myapp://login-callback?code=...
//   6) AndroidManifest 의 intent-filter 가 앱을 깨움 (singleTask 라 같은 인스턴스)
//   7) App.addListener('appUrlOpen') 가 발화 → URL 파싱 → exchangeCodeForSession
//   8) Browser.close() 로 Chrome Custom Tabs 닫고 앱으로 복귀
//
// 사전 설정 (Supabase Dashboard):
//   Authentication → URL Configuration → Redirect URLs 에
//   `jaringobi.myapp://login-callback` 추가 필요. 없으면 Supabase 가 콜백 거부.

import { Capacitor } from '@capacitor/core';
import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { getSupabase } from './supabase';

export const OAUTH_REDIRECT = 'jaringobi.myapp://login-callback';

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

let listenerInstalled = false;

/**
 * 앱 부팅 시 1회 호출. 딥링크 수신 시 Supabase 세션 교환 처리.
 * 웹/Capacitor 모두 안전 (웹에선 isNativePlatform=false → no-op).
 */
export function installOAuthDeepLinkListener() {
  if (listenerInstalled) return;
  if (!isNativePlatform()) {
    console.info('[oauth] 웹 환경 — 딥링크 리스너 설치 생략');
    return;
  }
  listenerInstalled = true;
  console.info('[oauth] 딥링크 리스너 설치 — scheme:', OAUTH_REDIRECT);

  App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
    try {
      const url = event.url;
      console.info('[oauth] appUrlOpen 수신', { url });
      if (!url || !url.startsWith('jaringobi.myapp://login-callback')) {
        console.info('[oauth] 콜백 URL 아님 — 무시');
        return;
      }

      const sb = getSupabase();
      if (!sb) {
        console.warn('[oauth] Supabase 미초기화 — 콜백 무시. .env 의 VITE_SUPABASE_URL/ANON_KEY 확인 필요');
        await Browser.close().catch(() => {});
        return;
      }

      // URL 형태 두 가지:
      //   PKCE flow: jaringobi.myapp://login-callback?code=XXX
      //   Implicit:  jaringobi.myapp://login-callback#access_token=...&refresh_token=...
      const queryIdx = url.indexOf('?');
      const hashIdx = url.indexOf('#');
      console.info('[oauth] URL 파싱', { queryIdx, hashIdx });

      // 콜백 자체에 error 파라미터가 실려 오는 경우 (사용자 취소, 권한 거부 등)
      const errorParams = new URLSearchParams(url.split(/[?#]/).slice(1).join('&'));
      const errorCode = errorParams.get('error');
      const errorDesc = errorParams.get('error_description');
      if (errorCode) {
        console.error('[oauth] 콜백에 error 포함', { error: errorCode, description: errorDesc });
        await Browser.close().catch(() => {});
        return;
      }

      if (queryIdx >= 0) {
        const params = new URLSearchParams(url.slice(queryIdx + 1));
        const code = params.get('code');
        if (code) {
          console.info('[oauth] PKCE code 발견 — exchangeCodeForSession 호출');
          const { data, error } = await sb.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('[oauth] exchangeCodeForSession 실패', { message: error.message, status: (error as { status?: number }).status });
          } else {
            console.info('[oauth] 세션 교환 성공', { userId: data.session?.user?.id });
          }
        } else {
          console.warn('[oauth] query 에 code 없음 — URL:', url);
        }
      } else if (hashIdx >= 0) {
        const params = new URLSearchParams(url.slice(hashIdx + 1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          console.info('[oauth] hash 토큰 발견 — setSession 호출');
          const { error } = await sb.auth.setSession({ access_token, refresh_token });
          if (error) console.error('[oauth] setSession 실패', { message: error.message });
          else console.info('[oauth] setSession 성공');
        } else {
          console.warn('[oauth] hash 에 토큰 없음 — URL:', url);
        }
      } else {
        console.warn('[oauth] URL 에 query/hash 모두 없음 — URL:', url);
      }

      await Browser.close().catch(() => {});
    } catch (e) {
      console.error('[oauth] 딥링크 처리 예외', e);
    }
  });
}

/**
 * Capacitor 안드로이드 — 외부 브라우저로 OAuth 시작.
 * `skipBrowserRedirect: true` 로 URL 만 받아 Browser.open() 에 전달.
 */
export async function signInWithGoogleNative() {
  console.info('[oauth] signInWithGoogleNative 시작', { listenerInstalled, isNative: isNativePlatform() });
  const sb = getSupabase();
  if (!sb) {
    console.error('[oauth] Supabase 미초기화 — .env 의 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 확인');
    throw new Error('Supabase 가 설정되지 않았습니다.');
  }
  if (!listenerInstalled) {
    console.warn('[oauth] 딥링크 리스너 미설치 — main.tsx 에서 installOAuthDeepLinkListener() 호출 확인 필요. 지금 늦게라도 설치 시도');
    installOAuthDeepLinkListener();
  }
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: OAUTH_REDIRECT,
      skipBrowserRedirect: true,
    },
  });
  if (error) {
    console.error('[oauth] signInWithOAuth 실패', { message: error.message, status: (error as { status?: number }).status });
    throw error;
  }
  if (!data?.url) {
    console.error('[oauth] OAuth URL 미반환 — Supabase Dashboard Google Provider 활성 상태 확인 필요');
    throw new Error('OAuth URL 을 받지 못했어요. Supabase Dashboard Google 활성 상태 점검 필요');
  }
  console.info('[oauth] OAuth URL 획득 — Chrome Custom Tabs 열기', { hostPreview: data.url.slice(0, 60) });
  try {
    await Browser.open({ url: data.url, presentationStyle: 'popover' });
  } catch (e) {
    console.error('[oauth] Browser.open 실패 — @capacitor/browser 플러그인 설치/sync 확인', e);
    throw e;
  }
}
