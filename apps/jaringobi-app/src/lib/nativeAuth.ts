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
  if (!isNativePlatform()) return;
  listenerInstalled = true;

  App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
    try {
      const url = event.url;
      if (!url || !url.startsWith('jaringobi.myapp://login-callback')) return;

      const sb = getSupabase();
      if (!sb) {
        console.warn('[oauth] Supabase 미초기화 — 콜백 무시');
        await Browser.close().catch(() => {});
        return;
      }

      // URL 형태 두 가지:
      //   PKCE flow: jaringobi.myapp://login-callback?code=XXX
      //   Implicit:  jaringobi.myapp://login-callback#access_token=...&refresh_token=...
      const queryIdx = url.indexOf('?');
      const hashIdx = url.indexOf('#');

      if (queryIdx >= 0) {
        const params = new URLSearchParams(url.slice(queryIdx + 1));
        const code = params.get('code');
        if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code);
          if (error) console.error('[oauth] exchangeCodeForSession 실패', error);
        }
      } else if (hashIdx >= 0) {
        const params = new URLSearchParams(url.slice(hashIdx + 1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          const { error } = await sb.auth.setSession({ access_token, refresh_token });
          if (error) console.error('[oauth] setSession 실패', error);
        }
      }

      await Browser.close().catch(() => {});
    } catch (e) {
      console.error('[oauth] 딥링크 처리 에러', e);
    }
  });
}

/**
 * Capacitor 안드로이드 — 외부 브라우저로 OAuth 시작.
 * `skipBrowserRedirect: true` 로 URL 만 받아 Browser.open() 에 전달.
 */
export async function signInWithGoogleNative() {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase 가 설정되지 않았습니다.');
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: OAUTH_REDIRECT,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('OAuth URL 을 받지 못했어요.');
  await Browser.open({ url: data.url, presentationStyle: 'popover' });
}
