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
  /** 명예의 전당 — 누적 절약액 내림차순 상위 N명 */
  listTop(limit: number): Promise<PublicProfile[]>;
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
  async listTop(limit) {
    // 데모용 시드 — Honor 에서 fallback 으로 노출
    const demoNicks = ['절약왕민지', '짠돌이서준', '알뜰이수아', '무지출지호', '신참자린이'];
    return demoNicks.slice(0, limit).map(demoProfile);
  },
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
  user_id?: string | null;
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
    const { data: sessionData } = await sb.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      console.warn('[profilesRepo.upsertMe] no auth session — skip');
      return;
    }
    // user_id 기준 upsert. profiles.user_id 가 unique 인덱스인 전제.
    const row: Partial<ProfileRow> = { ...profileToRow(profile), user_id: userId };
    const { error } = await sb.from('profiles').upsert(row, { onConflict: 'user_id' });
    if (error) {
      console.error('[profilesRepo.upsertMe] upsert 실패', { row, error });
    }
  },

  async listTop(limit) {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .order('total_saved', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('[profilesRepo.listTop] 실패', error);
      return [];
    }
    return (data ?? []).map((r: ProfileRow) => rowToProfile(r));
  },

  async tryRename(_oldNick, profile) {
    const sb = getSupabase();
    if (!sb) return { ok: true };
    const { data: sessionData } = await sb.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      return { ok: false, reason: 'unknown', message: '로그인 세션이 없어요. 페이지를 새로고침해 주세요.' };
    }
    // 본인 row 가 있으면 UPDATE, 없으면 INSERT — user_id 기준 upsert.
    // 닉네임이 다른 사용자에게 이미 잡혀 있으면 nickname unique 제약(PK)에서 23505.
    const row: Partial<ProfileRow> = { ...profileToRow(profile), user_id: userId };
    const { error } = await sb.from('profiles').upsert(row, { onConflict: 'user_id' });
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        return { ok: false, reason: 'taken', message: '이미 사용 중인 닉네임이에요.' };
      }
      console.error('[profilesRepo.tryRename] upsert 실패', { row, error });
      return { ok: false, reason: 'unknown', message: error.message ?? '닉네임 변경에 실패했어요.' };
    }
    return { ok: true };
  },
};

export const profilesRepo: ProfilesRepo = isSupabaseEnabled() ? supabaseRepo : localRepo;
