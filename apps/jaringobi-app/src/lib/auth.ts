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

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}
