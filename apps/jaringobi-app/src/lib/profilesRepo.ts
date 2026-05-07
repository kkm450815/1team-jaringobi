// 사용자 프로필 저장소.
//
// schema (docs/SUPABASE.md):
//   profiles(nickname pk, cycle, day, total_saved, goal,
//            active_title_id, owned_titles[], equipped[], updated_at)
//
// nickname 이 PK (=unique). 닉네임 변경 = 새 row INSERT + 옛 row DELETE 시도.
// 새 INSERT 가 unique 위반이면 "이미 사용 중" 으로 변경 거부.

import { REMODEL_FILES, SHOP_GROUPS, TITLES } from './data';
import { getSupabase, isSupabaseEnabled } from './supabase';

export interface PublicProfile {
  nickname: string;
  cycle: number;
  day: number;
  totalSaved: number;
  goal: number;
  activeTitleId: string;
  ownedTitles: string[];
  equipped: string[];
}

export type RenameResult =
  | { ok: true }
  | { ok: false; reason: 'taken' | 'unknown'; message: string };

export interface ProfilesRepo {
  /** 닉네임으로 프로필 조회. 없으면 null */
  getByNick(nick: string): Promise<PublicProfile | null>;
  /** 본인 프로필 upsert — 닉네임 외 필드 갱신용 (nickname 충돌 가능성 없음) */
  upsertMe(profile: PublicProfile): Promise<void>;
  /** 닉네임 변경 — unique 위반 시 reason: 'taken' 반환. 성공 시 옛 row 삭제 시도 */
  tryRename(oldNick: string, profile: PublicProfile): Promise<RenameResult>;
}

/* ---------------- 데모 데이터 (Supabase 미설정 시 — 개발용) ---------------- */

function hashNick(nick: string): number {
  let h = 0;
  for (let i = 0; i < nick.length; i++) h = (h * 31 + nick.charCodeAt(i)) >>> 0;
  return h;
}

function pickFrom(arr: string[], h: number): string | undefined {
  if (!arr.length) return undefined;
  return arr[h % arr.length];
}

function demoProfile(nick: string): PublicProfile {
  const h = hashNick(nick);
  const titleIdx = h % TITLES.length;
  const cycle = (h % 5) + 1;
  const day = (h % 30) + 1;
  const equipped: string[] = [];
  const shirt = pickFrom(SHOP_GROUPS.티셔츠, h);
  if (shirt) equipped.push(shirt);
  const wall = pickFrom(REMODEL_FILES.벽지, h >> 3);
  if (wall) equipped.push(wall);
  if ((h >> 1) % 2 === 0) {
    const lamp = pickFrom(REMODEL_FILES.조명, h >> 5);
    if (lamp) equipped.push(lamp);
  }
  if ((h >> 2) % 2 === 0) {
    const left = pickFrom(REMODEL_FILES.소품, h >> 7);
    if (left) equipped.push(left);
  }
  if ((h >> 4) % 3 !== 0) {
    const front = pickFrom(REMODEL_FILES.가구1, h >> 9);
    if (front) equipped.push(front);
  }
  return {
    nickname: nick,
    cycle,
    day,
    totalSaved: 10000 + (h % 50) * 5000,
    goal: 300_000,
    activeTitleId: TITLES[titleIdx]?.id ?? 'h0',
    ownedTitles: TITLES.slice(0, titleIdx + 1).map((t) => t.id),
    equipped,
  };
}

const localRepo: ProfilesRepo = {
  async getByNick(nick) {
    if (!nick) return null;
    return demoProfile(nick);
  },
  async upsertMe() { /* localStorage 모드에선 별도 저장소 불필요 — useUser 가 곧 본인 프로필 */ },
  async tryRename() { return { ok: true }; },
};

/* ---------------- Supabase 구현 ---------------- */

interface ProfileRow {
  nickname: string;
  cycle: number;
  day: number;
  total_saved: number;
  goal: number;
  active_title_id: string;
  owned_titles: string[] | null;
  equipped: string[] | null;
}

function rowToProfile(r: ProfileRow): PublicProfile {
  return {
    nickname: r.nickname,
    cycle: r.cycle,
    day: r.day,
    totalSaved: r.total_saved,
    goal: r.goal,
    activeTitleId: r.active_title_id,
    ownedTitles: r.owned_titles ?? [],
    equipped: r.equipped ?? [],
  };
}

function profileToRow(p: PublicProfile): ProfileRow {
  return {
    nickname: p.nickname,
    cycle: p.cycle,
    day: p.day,
    total_saved: p.totalSaved,
    goal: p.goal,
    active_title_id: p.activeTitleId,
    owned_titles: p.ownedTitles,
    equipped: p.equipped,
  };
}

const supabaseRepo: ProfilesRepo = {
  async getByNick(nick) {
    if (!nick) return null;
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('nickname', nick)
      .maybeSingle();
    if (error) {
      console.error('[profilesRepo.getByNick] 조회 실패', { nick, error });
      return null;
    }
    if (!data) return null;
    return rowToProfile(data as ProfileRow);
  },

  async upsertMe(profile) {
    const sb = getSupabase();
    if (!sb) return;
    const row = profileToRow(profile);
    const { error } = await sb.from('profiles').upsert(row, { onConflict: 'nickname' });
    if (error) {
      console.error('[profilesRepo.upsertMe] upsert 실패', { row, error });
      // 호출자에게 던지지 않음 — 사진 저장 등 메인 흐름이 막히지 않도록 best-effort
    }
  },

  async tryRename(oldNick, profile) {
    const sb = getSupabase();
    if (!sb) return { ok: true };
    if (oldNick === profile.nickname) {
      // 닉 미변경 — 그냥 upsert
      await this.upsertMe(profile);
      return { ok: true };
    }
    // 새 닉으로 INSERT 시도 (PK 충돌이면 unique violation)
    const row = profileToRow(profile);
    const { error: insertErr } = await sb.from('profiles').insert(row);
    if (insertErr) {
      // Postgres unique_violation 코드: 23505
      const code = (insertErr as { code?: string }).code;
      if (code === '23505') {
        return { ok: false, reason: 'taken', message: '이미 사용 중인 닉네임이에요.' };
      }
      console.error('[profilesRepo.tryRename] insert 실패', { row, insertErr });
      return { ok: false, reason: 'unknown', message: insertErr.message ?? '닉네임 변경에 실패했어요.' };
    }
    // 새 row INSERT 성공 — 옛 row 삭제 시도 (실패해도 critical 아님)
    if (oldNick) {
      const { error: delErr } = await sb.from('profiles').delete().eq('nickname', oldNick);
      if (delErr) console.warn('[profilesRepo.tryRename] 옛 닉 row 삭제 실패 (무시)', { oldNick, delErr });
    }
    return { ok: true };
  },
};

export const profilesRepo: ProfilesRepo = isSupabaseEnabled() ? supabaseRepo : localRepo;
