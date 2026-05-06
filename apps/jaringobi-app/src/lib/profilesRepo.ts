// 사용자 프로필 저장소 추상화. /profile/:nick 라우트에서 다른 사용자 프로필을 불러올 때 사용.
// 현재는 시드 데이터(TALK_POSTS의 nick들 + ME_NICK) 기반 데모 프로필 반환.
// Supabase 연동 시 profiles 테이블과 매핑.

import { ME_NICK, REMODEL_FILES, SHOP_GROUPS, TALK_POSTS, TITLES } from './data';
import { getSupabase, isSupabaseEnabled } from './supabase';

export interface PublicProfile {
  nickname: string;
  cycle: number;
  day: number;
  totalSaved: number;
  goal: number;
  activeTitleId: string;   // TITLES 의 id
  ownedTitles: string[];   // 가시화용
  equipped: string[];      // 캐릭터 방 미리보기용 (티셔츠·조명·벽지·가구·소품·악세 src)
  isMe: boolean;
}

export interface ProfilesRepo {
  /** 닉네임으로 프로필 조회. 없으면 null */
  getByNick(nick: string): Promise<PublicProfile | null>;
}

/* ---------------- 데모 데이터 (시드 사용자별 임의 진행도) ---------------- */

// 시드 사용자 닉네임 → 프로필 더미 데이터.
// nick 해시값으로 deterministic하게 cycle/day/title을 분배.
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
  // 닉 해시 기반 결정적 룸 구성 — 티셔츠 1, 벽지 1, 조명/가구/소품 일부
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
    isMe: nick === ME_NICK,
  };
}

/* ---------------- localStorage(시드) 구현 ---------------- */

const localRepo: ProfilesRepo = {
  async getByNick(nick) {
    if (!nick) return null;
    // 본인이면 useUser 로 직접 읽으면 되지만, 통일된 인터페이스로 노출
    const seedNicks = new Set(TALK_POSTS.map((p) => p.nick));
    if (nick === ME_NICK || seedNicks.has(nick)) {
      return demoProfile(nick);
    }
    return demoProfile(nick); // 그 외 닉네임도 데모 프로필 생성 (사용자가 직접 작성한 글의 작성자 등)
  },
};

/* ---------------- Supabase 구현 (스텁) ---------------- */

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

const supabaseRepo: ProfilesRepo = {
  async getByNick(nick) {
    if (!nick) return null;
    const sb = getSupabase();
    if (!sb) return demoProfile(nick);
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('nickname', nick)
      .maybeSingle();
    if (error || !data) {
      // DB 미존재 시 데모 프로필 폴백 (시드 닉용)
      return demoProfile(nick);
    }
    const row = data as ProfileRow;
    return {
      nickname: row.nickname,
      cycle: row.cycle,
      day: row.day,
      totalSaved: row.total_saved,
      goal: row.goal,
      activeTitleId: row.active_title_id,
      ownedTitles: row.owned_titles ?? [],
      equipped: row.equipped ?? [],
      isMe: nick === ME_NICK,
    };
  },
};

export const profilesRepo: ProfilesRepo = isSupabaseEnabled() ? supabaseRepo : localRepo;
