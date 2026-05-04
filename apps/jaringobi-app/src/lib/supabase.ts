// Supabase 클라이언트 — 환경변수가 설정되어 있으면 실제 클라이언트, 아니면 null.
// 사용처는 항상 isSupabaseEnabled() 체크 후 분기. 미설정 상태에서는 localStorage 폴백.
//
// 연동 단계:
//   1. pnpm add @supabase/supabase-js
//   2. apps/jaringobi-app/.env.local 에 아래 두 키 설정
//        VITE_SUPABASE_URL=...
//        VITE_SUPABASE_ANON_KEY=...
//   3. docs/SUPABASE.md 의 SQL 스키마 적용
//   4. 이 파일에서 createClient import 주석 해제 + return 부분 활성화

// import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type SupabaseClient = unknown; // 임시 타입 — 패키지 설치 후 실제 타입으로 교체

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (client) return client;
  // 패키지 설치 후 다음 줄 활성화:
  // client = createClient(url, anonKey, { auth: { persistSession: true } });
  return client;
}

export function isSupabaseEnabled(): boolean {
  return !!(url && anonKey);
}
