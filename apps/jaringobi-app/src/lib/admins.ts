// 현재 로그인 사용자가 admins 테이블에 등록된 관리자인지 확인.
// admins 의 RLS 정책: select using (auth.uid() = user_id) — 본인 row 만 보임.
// → 일반 사용자는 admins 조회 시 빈 결과를 받고, 관리자는 자신의 row 를 받음.

import { useEffect, useState } from 'react';
import { getSupabase } from './supabase';

export type AdminCheck = 'loading' | 'admin' | 'not-admin' | 'error';

export function useIsAdmin(userId: string | null | undefined): AdminCheck {
  const [state, setState] = useState<AdminCheck>('loading');

  useEffect(() => {
    if (!userId) {
      setState('not-admin');
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      setState('error');
      return;
    }
    let cancelled = false;
    setState('loading');
    sb.from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('[useIsAdmin] admins 조회 실패', error);
          setState('error');
          return;
        }
        setState(data ? 'admin' : 'not-admin');
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}
