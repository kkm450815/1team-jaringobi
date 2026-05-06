// Supabase 클라이언트 — 환경변수가 설정되어 있으면 실제 클라이언트, 아니면 null.
// 사용처는 항상 isSupabaseEnabled() 체크 후 분기. 미설정 상태에서는 localStorage 폴백.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (client) return client;
  client = createClient(url, anonKey, { auth: { persistSession: true } });
  return client;
}

export function isSupabaseEnabled(): boolean {
  return !!(url && anonKey);
}

export type { SupabaseClient };
