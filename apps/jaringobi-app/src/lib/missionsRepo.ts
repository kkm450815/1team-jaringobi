// 챌린지/미션 (missions 테이블).
// 기존 lib/data.ts 의 MISSIONS 상수를 DB 로 이관 — ID(m1~m20) 는 텍스트 PK 그대로 유지.
//
// schema (docs/SUPABASE.md 3-8):
//   missions(id text pk, category, title, amount, difficulty, icon_key,
//            intro, tips jsonb, auth_method, sort_order, active, ...)
//
// listActive() 결과가 0개면 호출측이 코드의 MISSION_SEED 를 fallback 으로 사용한다.

import { getSupabase, isSupabaseEnabled } from './supabase';
import type { Mission, MissionCategory, Difficulty } from './data';

interface MissionRow {
  id: string;
  category: MissionCategory;
  title: string;
  amount: number;
  difficulty: Difficulty;
  icon_key: string;
  intro: string;
  tips: unknown;
  auth_method: string;
  sort_order: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

function rowToMission(r: MissionRow): Mission {
  const tips = Array.isArray(r.tips) ? (r.tips as unknown[]).map(String) : [];
  return {
    id: r.id,
    category: r.category,
    title: r.title,
    amount: r.amount,
    difficulty: r.difficulty,
    iconKey: r.icon_key,
    intro: r.intro,
    tips,
    authMethod: r.auth_method,
  };
}

interface MissionWithMeta extends Mission {
  sortOrder: number;
  active: boolean;
}

function rowToMissionMeta(r: MissionRow): MissionWithMeta {
  return {
    ...rowToMission(r),
    sortOrder: r.sort_order,
    active: r.active,
  };
}

function missionToRow(m: MissionWithMeta): Partial<MissionRow> {
  const row: Partial<MissionRow> = {
    id: m.id,
    category: m.category,
    title: m.title,
    amount: m.amount,
    difficulty: m.difficulty,
    icon_key: m.iconKey,
    intro: m.intro,
    tips: m.tips,
    auth_method: m.authMethod,
    sort_order: m.sortOrder,
    active: m.active,
    updated_at: new Date().toISOString(),
  };
  return row;
}

export interface MissionsRepo {
  /** 사용자용 — active 항목만 */
  listActive(): Promise<Mission[]>;
  /** admin 용 — 전체 (sortOrder/active 포함) */
  listAll(): Promise<MissionWithMeta[]>;
  upsert(m: MissionWithMeta): Promise<MissionWithMeta>;
  remove(id: string): Promise<void>;
  subscribe(cb: () => void): () => void;
}

const localRepo: MissionsRepo = {
  async listActive() { return []; },
  async listAll() { return []; },
  async upsert(m) { return m; },
  async remove() { /* no-op */ },
  subscribe() { return () => {}; },
};

const supabaseRepo: MissionsRepo = {
  async listActive() {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from('missions')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('[missionsRepo.listActive] 실패', error);
      return [];
    }
    return (data ?? []).map((r: MissionRow) => rowToMission(r));
  },

  async listAll() {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const { data, error } = await sb
      .from('missions')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('[missionsRepo.listAll] 실패', error);
      throw error;
    }
    return (data ?? []).map((r: MissionRow) => rowToMissionMeta(r));
  },

  async upsert(m) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const row = missionToRow(m);
    const { data, error } = await sb
      .from('missions')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error) {
      console.error('[missionsRepo.upsert] 실패', { row, error });
      throw error;
    }
    return rowToMissionMeta(data as MissionRow);
  },

  async remove(id) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const { error } = await sb.from('missions').delete().eq('id', id);
    if (error) {
      console.error('[missionsRepo.remove] 실패', { id, error });
      throw error;
    }
  },

  subscribe(cb) {
    const sb = getSupabase();
    if (!sb) return () => {};
    const channel = sb
      .channel('missions_changes')
      .on(
        'postgres_changes' as 'system',
        { event: '*', schema: 'public', table: 'missions' },
        () => cb(),
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  },
};

export const missionsRepo: MissionsRepo = isSupabaseEnabled() ? supabaseRepo : localRepo;
export type { MissionWithMeta };
