// Supabase Auth 세션 헬퍼.
// 매직 링크(OTP) 기반 패스워드리스 로그인.
//
// 사용 흐름:
//  1) 사용자가 이메일 입력 → signInWithEmail() → Supabase 가 메일 발송
//  2) 사용자가 메일의 링크 클릭 → /admin 으로 리다이렉트, URL 해시에 토큰
//  3) Supabase JS SDK 가 detectSessionInUrl(default true) 로 자동 세션 설정
//  4) onAuthStateChange 가 useSession 을 트리거 → UI 가 인증 상태 반영

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

/** 현재 세션. undefined = 로딩 중, null = 비로그인, Session = 로그인 됨 */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setSession(null);
      return;
    }
    let cancelled = false;
    sb.auth.getSession().then(({ data }) => {
      if (!cancelled) setSession(data.session ?? null);
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, s) => {
      if (!cancelled) setSession(s);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return session;
}

/**
 * 일반 사용자용 — 세션이 없으면 익명 sign-in 으로 auth.uid() 를 확보.
 *
 * Supabase Dashboard 의 Authentication → Providers → Anonymous Sign-Ins 가
 * ON 이어야 동작. 비활성화 상태이면 422 등 에러로 실패하고, 이 함수는 null 을
 * 반환합니다 (앱은 계속 동작하되 INSERT/UPDATE 가 RLS 로 차단됨).
 *
 * 매직 링크로 이미 로그인된 관리자/유저 세션이 있으면 그대로 유지.
 */
export async function ensureAnonymousSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { session: existing } } = await sb.auth.getSession();
  if (existing) return existing;
  const { data, error } = await sb.auth.signInAnonymously();
  if (error) {
    console.error('[ensureAnonymousSession] signInAnonymously 실패 — Supabase Dashboard 의 Anonymous Sign-Ins 가 켜져 있는지 확인하세요.', error);
    return null;
  }
  return data.session;
}

export async function signInWithEmail(email: string, redirectPath = '/admin') {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase 가 설정되지 않았습니다.');
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !/.+@.+\..+/.test(trimmed)) {
    throw new Error('올바른 이메일 형식이 아닙니다.');
  }
  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}${redirectPath}`
      : undefined;
  const { error } = await sb.auth.signInWithOtp({
    email: trimmed,
    options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
  });
  if (error) throw error;
}

/**
 * Google OAuth 로그인. 성공 시 Supabase 가 콜백 URL 로 리다이렉트하고 세션을
 * 자동 설정.
 *
 * 사전 설정 필요:
 *  1) Google Cloud Console — OAuth 2.0 Client 생성, Authorized redirect URI 에
 *     `https://<프로젝트>.supabase.co/auth/v1/callback` 등록
 *  2) Supabase Dashboard — Authentication → Providers → Google ON, Client ID/
 *     Secret 입력
 *  3) Supabase Dashboard — Authentication → URL Configuration 에 앱 도메인 등록
 */
export async function signInWithGoogle(redirectPath = '/main') {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase 가 설정되지 않았습니다.');
  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}${redirectPath}`
      : undefined;
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: redirectTo ? { redirectTo } : undefined,
  });
  if (error) throw error;
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}
