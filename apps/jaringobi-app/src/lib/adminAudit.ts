// 관리자 감사 로그 & 관리자 목록.
//
// 데이터베이스 사전 적용 필요: docs/SUPABASE_AUDIT_LOG.sql
//
// 흐름:
//   1) 관리자가 Admin UI 에서 CRUD 작업
//   2) 작업 성공 직후 logAdminAction(...) fire-and-forget 호출
//   3) Supabase admin_audit_log 테이블에 한 줄 insert
//   4) 다른 관리자가 "관리자/기록" 탭에서 목록 조회 → 시간 순으로 표시

import { getSupabase } from './supabase';

export interface AdminInfo {
  user_id: string;
  email: string;
  /** 관리자 표시 이름. null 이면 미설정 — 이메일로만 표시. */
  name: string | null;
  created_at: string;
}

export type AuditAction = 'create' | 'update' | 'delete' | 'toggle';

export interface AuditLogEntry {
  id: string;
  admin_user_id: string | null;
  admin_email: string | null;
  action: AuditAction;
  target_table: string;
  target_id: string | null;
  target_name: string | null;
  details: unknown;
  created_at: string;
}

/** 관리자 전체 목록 조회. security definer RPC 가 RLS 우회 후 본인 권한 확인. */
export async function listAdmins(): Promise<AdminInfo[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc('admin_list_admins');
  if (error) throw error;
  return (data ?? []) as AdminInfo[];
}

/**
 * 본인 관리자 이름 변경. 빈 문자열 / null 이면 이름 미설정 상태로 되돌림.
 * RLS 우회 RPC — 호출자 본인 row 만 update.
 */
export async function updateMyAdminName(newName: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase 미초기화');
  const { error } = await sb.rpc('admin_update_my_name', { new_name: newName });
  if (error) throw error;
}

/** 감사 로그 최근 N건 조회 (기본 200). created_at desc 순. */
export async function listAuditLog(limit = 200): Promise<AuditLogEntry[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AuditLogEntry[];
}

/**
 * 감사 로그 한 줄 추가. CRUD 직후 fire-and-forget 으로 호출.
 *
 * 실패 시 콘솔 에러만 — UI 흐름은 막지 않음.
 * 테이블이 아직 생성되지 않은 환경에서도 앱은 정상 동작 (조용히 실패).
 */
export async function logAdminAction(
  action: AuditAction,
  target_table: string,
  target_id: string | null,
  target_name?: string | null,
  details?: Record<string, unknown>,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('admin_audit_log').insert({
      admin_user_id: user.id,
      admin_email: user.email ?? null,
      action,
      target_table,
      target_id,
      target_name: target_name ?? null,
      details: details ?? null,
    });
  } catch (e) {
    // 테이블 미생성·RLS 거부 등 — 로그는 보조 기능이므로 조용히 실패
    console.error('[adminAudit.logAdminAction] 실패', e);
  }
}

/** target_table 한국어 라벨. UI 표시용. */
export const TABLE_LABELS: Record<string, string> = {
  talk_rooms: '수다방',
  talk_posts: '수다방 글',
  announcements: '공지/이벤트',
  shop_items: '상점 아이템',
  missions: '미션',
  titles: '칭호',
};

/** action 한국어 라벨. */
export const ACTION_LABELS: Record<AuditAction, string> = {
  create: '생성',
  update: '수정',
  delete: '삭제',
  toggle: '활성/비활성',
};
