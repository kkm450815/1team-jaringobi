import { useCallback, useEffect, useState } from 'react';
import { equipSlotOf, getTitleProgress, MISSIONS, TITLES } from './data';
import { profilesRepo, PublicProfile } from './profilesRepo';

const DEFAULT_NICK = '자린이';

function userToProfile(s: UserState): PublicProfile {
  return {
    nickname: s.nickname,
    cycle: s.cycle,
    day: s.day,
    totalSaved: s.totalSaved,
    goal: s.goal,
    activeTitleId: s.activeTitleId,
    ownedTitles: s.ownedTitles,
    equipped: s.equipped,
  };
}

// 미션 ID → 보상 금액 룩업 (savePhoto 보상 계산용).
// MISSIONS 는 부팅 시 DB 에서 채워지는 mutable cache 라 함수로 동적 조회.
function missionAmountOf(id: string): number {
  return MISSIONS.find((m) => m.id === id)?.amount ?? 0;
}

const KEY = 'jaringobi.user.v1';

export interface UserSettings {
  notifyChallenge: boolean;
  notifyHeart: boolean;
  /** 마스터 사운드 토글 — OFF 면 BGM·SFX 모두 무음 */
  sound: boolean;
  vibration: boolean;
  /** BGM 볼륨 0~100 */
  bgmVolume: number;
  /** SFX 토글 — sound 가 ON 이라도 SFX 만 따로 끌 수 있음 */
  sfxEnabled: boolean;
  /** SFX 볼륨 0~100 */
  sfxVolume: number;
}

export interface UserState {
  nickname: string;
  cycle: number;
  day: number;
  hearts: number; // 양심 하트 (0..3) — 회차 시작 시 3 복구
  photos: Record<number, string>;
  totalSaved: number;
  goal: number;
  coins: number;
  owned: string[];
  equipped: string[];
  missionPicks: string[];
  missionConfirmed: string[];

  // review 화면에서 성공 표시한 슬롯 인덱스
  // 같은 미션이 중복으로 뽑혀도 각각 체크 가능하게 number[] 유지
  missionSuccesses: number[];

  // 마이페이지에서 표시할 칭호 ID
  activeTitleId: string;
  // 획득한 칭호 ID 목록 (회차 완주/카테고리 N회 등으로 자동 추가)
  ownedTitles: string[];

  // 칭호 진행도 — 미션 ID별 성공한 (cycle,day) 키 목록 (같은 날 같은 미션 1회만 인정)
  missionWinDays: Record<string, string[]>;
  // savePhoto 누적 횟수 (자린고비 칭호 등의 totalSaveCount 조건)
  totalSaveCount: number;

  // 마지막으로 사진 인증을 마친 시각 (ISO). 다음 미션은 그 시각 이후의 첫 새벽 4시(local) 부터 가능.
  // null = 아직 한 번도 인증 안 했거나 잠김 해제됨 → 즉시 가능.
  lastSavedAt: string | null;

  // /main 첫 진입 시 코치마크 튜토리얼을 1회 노출. Settings 에서 다시 보기 가능.
  tutorialSeen: boolean;

  // 양심 0 도달 → 코인 절반 차감을 회차당 1회만 적용. 차감 적용한 cycle 번호 기록.
  // null = 아직 적용 안 됨. 다음 cycle 로 넘어가면 자연스럽게 다시 적용 가능.
  lastZeroPenaltyCycle: number | null;

  settings: UserSettings;
}

const MISSION_UNLOCK_HOUR = 4; // 새벽 4시 (local)

/** lastSavedAt 이후 처음 도래하는 새벽 4시 (잠김이 풀리는 시각). null → 잠김 없음. */
export function nextMissionAvailableAt(lastSavedAt: string | null): Date | null {
  if (!lastSavedAt) return null;
  const last = new Date(lastSavedAt);
  if (Number.isNaN(last.getTime())) return null;
  const next = new Date(last);
  if (last.getHours() < MISSION_UNLOCK_HOUR) {
    // 새벽 4시 이전에 인증 → 같은 날 4시
    next.setHours(MISSION_UNLOCK_HOUR, 0, 0, 0);
  } else {
    // 새벽 4시 이후 인증 → 다음 날 4시
    next.setDate(next.getDate() + 1);
    next.setHours(MISSION_UNLOCK_HOUR, 0, 0, 0);
  }
  return next;
}

/** 지금 미션을 새로 시작할 수 있는지. (lastSavedAt 이후 새벽 4시 미만이면 잠김) */
export function isMissionLocked(lastSavedAt: string | null, now: Date = new Date()): boolean {
  const next = nextMissionAvailableAt(lastSavedAt);
  if (!next) return false;
  return now < next;
}

const MAX_HEARTS = 3;
const CYCLE_DAYS = 30;

const DEFAULT: UserState = {
  nickname: '자린이',
  cycle: 1,
  day: 1,
  hearts: MAX_HEARTS,
  photos: {},
  totalSaved: 0,
  goal: 300_000,
  coins: 0,
  owned: ['/shop/clothes/clo_shop_01.png', '/shop/clothes/clo_shop_51.png'],
  equipped: [],
  missionPicks: ['m2', 'm12', 'm13'],
  missionConfirmed: [],
  missionSuccesses: [],
  activeTitleId: 'h0',
  ownedTitles: ['h0'],
  missionWinDays: {},
  totalSaveCount: 0,
  lastSavedAt: null,
  tutorialSeen: false,
  lastZeroPenaltyCycle: null,
  settings: {
    notifyChallenge: true,
    notifyHeart: true,
    sound: true,
    vibration: false,
    bgmVolume: 60,
    sfxEnabled: true,
    sfxVolume: 80,
  },
};

function read(): UserState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;

    const parsed = JSON.parse(raw) as Partial<UserState>;

    const missionWinDays = parsed.missionWinDays ?? DEFAULT.missionWinDays;
    const totalSaveCount = typeof parsed.totalSaveCount === 'number'
      ? parsed.totalSaveCount
      : DEFAULT.totalSaveCount;
    const cycle = typeof parsed.cycle === 'number' ? parsed.cycle : DEFAULT.cycle;

    // 칭호 재평가 — 실제 진행도 기반으로 ownedTitles 결정.
    // 과거 잘못 부여된(예: 옛 DEFAULT 의 h1) 칭호들 제거.
    const titleCtx = { missionWinDays, totalSaveCount, cycle };
    const recomputedOwnedTitles = TITLES
      .filter((t) => t.id === 'h0' || getTitleProgress(t, titleCtx).achieved)
      .map((t) => t.id);

    return {
      ...DEFAULT,
      ...parsed,
      settings: { ...DEFAULT.settings, ...(parsed.settings ?? {}) },
      photos: parsed.photos ?? {},
      // clo_shop_51 은 무료 칭호처럼 모든 사용자에게 기본 보유
      owned: Array.from(new Set([...(parsed.owned ?? DEFAULT.owned), '/shop/clothes/clo_shop_51.png'])),
      equipped: parsed.equipped ?? DEFAULT.equipped,
      missionPicks: parsed.missionPicks ?? DEFAULT.missionPicks,
      missionConfirmed: parsed.missionConfirmed ?? DEFAULT.missionConfirmed,

      // 기존 저장값 중 string[]이 들어왔을 가능성 방지
      missionSuccesses: (parsed.missionSuccesses ?? DEFAULT.missionSuccesses).filter(
        (v): v is number => typeof v === 'number',
      ),

      ownedTitles: recomputedOwnedTitles,
      activeTitleId: parsed.activeTitleId && recomputedOwnedTitles.includes(parsed.activeTitleId)
        ? parsed.activeTitleId
        : 'h0',
      missionWinDays,
      totalSaveCount,
      lastSavedAt: typeof parsed.lastSavedAt === 'string' ? parsed.lastSavedAt : DEFAULT.lastSavedAt,
      tutorialSeen: typeof parsed.tutorialSeen === 'boolean' ? parsed.tutorialSeen : DEFAULT.tutorialSeen,
      lastZeroPenaltyCycle: typeof parsed.lastZeroPenaltyCycle === 'number' ? parsed.lastZeroPenaltyCycle : DEFAULT.lastZeroPenaltyCycle,
      hearts: typeof parsed.hearts === 'number' ? parsed.hearts : DEFAULT.hearts,
    };
  } catch {
    return DEFAULT;
  }
}

function write(s: UserState) {
  localStorage.setItem(KEY, JSON.stringify(s));
  // 같은 탭 안의 다른 useUser 인스턴스도 동기화 (storage 이벤트는 다른 탭에만 발사됨)
  try {
    window.dispatchEvent(new Event(USER_SYNC_EVENT));
  } catch { /* ignore */ }
}

const USER_SYNC_EVENT = 'jaringobi-user-sync';

export function useUser() {
  const [state, setState] = useState<UserState>(() => read());

  useEffect(() => {
    write(state);
  }, [state]);

  useEffect(() => {
    // deep-equal 로 무한 루프 방지: 내가 방금 쓴 값을 다시 받으면 setState 시 동일 객체 반환
    function applyFresh() {
      const next = read();
      setState((cur) => {
        try {
          if (JSON.stringify(cur) === JSON.stringify(next)) return cur;
        } catch { /* ignore */ }
        return next;
      });
    }
    function onStorage(e: StorageEvent) {
      if (e.key === KEY) applyFresh();
    }
    window.addEventListener('storage', onStorage);                  // 다른 탭
    window.addEventListener(USER_SYNC_EVENT, applyFresh);            // 같은 탭
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(USER_SYNC_EVENT, applyFresh);
    };
  }, []);

  const update = useCallback((patch: Partial<UserState>) => {
    setState((s) => {
      const next = { ...s, ...patch };
      write(next);
      return next;
    });
  }, []);

  const setNickname = useCallback((nickname: string) => {
    // 모바일에서 setState 업데이터가 batched 로 늦게 실행돼,
    // 다음 라우트가 stale localStorage 를 읽어 닉네임이 반영 안되던 이슈 방지.
    // → 최신 localStorage 를 직접 읽어 동기적으로 write 한 뒤 React state 동기화.
    const trimmed = nickname.trim();
    const fresh = read();
    const next: UserState = {
      ...fresh,
      nickname: trimmed || fresh.nickname,
    };
    write(next);
    setState(next);
  }, []);

  // 닉네임 변경 시 profiles 테이블에 새 row INSERT 시도. unique 위반(=다른 사용자
  // 사용 중) 이면 변경 거부하고 reason='taken' 반환.
  // 세션 미준비 등 환경 이슈는 로컬 저장만 진행 (Supabase 동기화는 best-effort).
  // 기본 닉('자린이') → 다른 닉으로 처음 설정할 때도 이 함수 사용.
  const tryRenameNickname = useCallback(
    async (newNick: string): Promise<{ ok: true } | { ok: false; reason: 'taken' | 'unknown'; message: string }> => {
      const trimmed = newNick.trim();
      if (!trimmed) return { ok: false, reason: 'unknown', message: '닉네임을 입력해주세요.' };
      const fresh = read();
      const oldNick = fresh.nickname;
      if (oldNick === trimmed) return { ok: true };
      // 기본 닉('자린이') 에서 시작하는 경우엔 옛 row 가 있을 가능성이 낮지만,
      // 안전을 위해 tryRename 에 oldNick 그대로 전달 (기본 닉이면 DELETE 가 다른
      // 사용자 row 를 건드릴 위험이 있어 oldNick 을 빈 문자열로 넘겨 옛 row 삭제 skip).
      const oldForRename = oldNick === DEFAULT_NICK ? '' : oldNick;
      const profile: PublicProfile = { ...userToProfile(fresh), nickname: trimmed };
      const result = await profilesRepo.tryRename(oldForRename, profile);
      if (!result.ok) {
        // 'taken' = 다른 사용자가 이미 사용 중 → 정말 거부
        if (result.reason === 'taken') return result;
        // 그 외(세션 없음 등) = Supabase 환경 이슈. 로컬은 저장하고 진행.
        // 사용자 흐름이 끊기지 않도록 — anonymous session 이 늦게 잡히는
        // 경우 등에 대한 fallback. 추후 설정 변경 시 자동 동기화됨.
        console.warn('[tryRenameNickname] Supabase 동기화 실패, 로컬만 저장:', result.message);
      }
      // 로컬 상태 갱신
      const next: UserState = { ...fresh, nickname: trimmed };
      write(next);
      setState(next);
      return { ok: true };
    },
    [],
  );

  const setSetting = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      setState((s) => {
        const next = { ...s, settings: { ...s.settings, [key]: value } };
        write(next);
        return next;
      });
    },
    [],
  );

  // 인증 사진 저장 → 보상(원/포인트) 계산해서 반환 (Camera 축하 팝업용).
  // 보상 규칙:
  //  · 노말(goal=300_000): 일평균 = goal/30 = 1만원 고정 → 100 포인트
  //  · 하드(goal>=1_000_000): 미션 합계만큼 적립 + 포인트는 보상의 1/100
  //    (노말 모드 비율 기준 — 1만원당 100포인트)
  // 회차 종료(day===30 인증):
  //  · cycle++, day=1, photos={}, hearts=3 복구
  //  · cycleEnded=true 반환해 호출자가 "회차 완료" 축하 표시 가능
  const savePhoto = useCallback((dataUrl: string) => {
    const s = state;
    const isHard = s.goal >= 1_000_000;
    const ids = s.missionConfirmed.length > 0 ? s.missionConfirmed : s.missionPicks;

    const reward = isHard
      ? ids.reduce((sum, id) => sum + missionAmountOf(id), 0)
      : Math.round(s.goal / 30);

    // 포인트는 보상에 비례 (1만원 = 100포인트). 노말 모드는 항상 100, 하드는 미션에 따라 달라짐.
    const coins = Math.round(reward / 100);
    const isCycleEnd = s.day >= CYCLE_DAYS;

    // setState 콜백 안에서 계산되는 칭호 획득 목록을 caller(Camera)로 빼내기 위한 캡처.
    // setState 콜백은 동기 실행이라 콜백 종료 시점에 값이 들어있음.
    let earnedTitleIds: string[] = [];

    setState((cur) => {
      const day = cur.day;
      const photosWithToday = { ...cur.photos, [day]: dataUrl };

      // 오늘 성공으로 체크된 미션 ID — (cycle,day) 키로 missionWinDays 갱신
      // 같은 날 같은 미션은 1회만 인정 (이미 키 존재하면 무시)
      const dayKey = `${cur.cycle}-${cur.day}`;
      const wonIds = cur.missionSuccesses
        .map((idx) => cur.missionConfirmed[idx])
        .filter((id): id is string => !!id);
      const nextWinDays: Record<string, string[]> = { ...cur.missionWinDays };
      for (const id of wonIds) {
        const days = nextWinDays[id] ?? [];
        if (!days.includes(dayKey)) nextWinDays[id] = [...days, dayKey];
      }

      const nextCycle = isCycleEnd ? cur.cycle + 1 : cur.cycle;
      const nextTotalSaveCount = cur.totalSaveCount + 1;

      // 칭호 자동 획득: 모든 reqs 충족하는 칭호를 ownedTitles에 추가
      const titleCtx = {
        missionWinDays: nextWinDays,
        totalSaveCount: nextTotalSaveCount,
        cycle: nextCycle,
      };
      const newlyEarned = TITLES
        .filter((t) => !cur.ownedTitles.includes(t.id))
        .filter((t) => getTitleProgress(t, titleCtx).achieved)
        .map((t) => t.id);
      earnedTitleIds = newlyEarned;
      const ownedTitles = newlyEarned.length > 0
        ? [...cur.ownedTitles, ...newlyEarned]
        : cur.ownedTitles;

      const base = {
        totalSaved: cur.totalSaved + reward,
        coins: cur.coins + coins,
        missionConfirmed: [],
        missionSuccesses: [],
        missionWinDays: nextWinDays,
        totalSaveCount: nextTotalSaveCount,
        ownedTitles,
        // 인증 완료 시각 기록 — 다음 미션은 이 시각 이후 첫 새벽 4시부터 가능 (lock)
        lastSavedAt: new Date().toISOString(),
      };
      const next: UserState = isCycleEnd
        ? {
            ...cur,
            ...base,
            photos: {},        // 회차 종료 → 캘린더 초기화
            day: 1,
            cycle: nextCycle,
            hearts: MAX_HEARTS, // 새 회차 양심 복구
          }
        : {
            ...cur,
            ...base,
            photos: photosWithToday,
            day: day + 1,
          };
      write(next);
      // 사진 저장으로 totalSaved/cycle/day 가 갱신됐으니 profiles 도 동기화.
      // 기본 닉('자린이') 사용자는 아직 프로필을 만들지 않았으므로 skip — 다른
      // 사용자가 같은 기본 닉으로 row 를 가질 가능성을 회피.
      if (next.nickname && next.nickname !== DEFAULT_NICK) {
        void profilesRepo.upsertMe(userToProfile(next));
        // 인증 사진을 record-photos Storage 에 비동기 업로드 (다른 사람 프로필
        // 의 RECORD 캘린더에서 보이도록). 실패해도 로컬·보상 흐름은 그대로.
        // 회차 종료(isCycleEnd) 면 day 매핑이 의미 없어지므로 photos 컬럼을 비움.
        if (isCycleEnd) {
          void profilesRepo.clearRecordPhotos();
        } else {
          void profilesRepo.syncRecordPhoto(cur.day, dataUrl);
        }
      }
      return next;
    });
    // 회차 완료 시 초기화 직전 사진 + 회차 정보를 호출자에게 넘김 (저장 안내 화면용)
    const archive = isCycleEnd
      ? {
          cycle: state.cycle,
          photos: { ...state.photos, [state.day]: dataUrl },
          totalSaved: state.totalSaved + reward,
        }
      : undefined;
    return { reward, coins, cycleEnded: isCycleEnd, archive, newlyEarnedTitles: earnedTitleIds };
  }, [state]);

  // 양심 1개 차감 (사용자가 ♥ 누르고 확인 모달에서 삭제 누른 경우)
  const loseHeart = useCallback(() => {
    setState((s) => {
      const next = { ...s, hearts: Math.max(0, s.hearts - 1) };
      write(next);
      return next;
    });
  }, []);

  // 양심 전체 복구 (회차 시작/리셋 등)
  const restoreHearts = useCallback(() => {
    setState((s) => {
      const next = { ...s, hearts: MAX_HEARTS };
      write(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(KEY);
    setState(DEFAULT);
  }, []);

  const buy = useCallback((src: string, price: number) => {
    let ok = false;

    setState((s) => {
      if (s.owned.includes(src)) return s;
      if (s.coins < price) return s;

      ok = true;

      const next: UserState = {
        ...s,
        coins: s.coins - price,
        owned: [...s.owned, src],
      };

      write(next);
      return next;
    });

    return ok;
  }, []);

  const toggleEquip = useCallback((src: string) => {
    setState((s) => {
      if (!s.owned.includes(src)) return s;

      let next: UserState;

      if (s.equipped.includes(src)) {
        next = {
          ...s,
          equipped: s.equipped.filter((x) => x !== src),
        };
      } else {
        const slot = equipSlotOf(src);
        const others = s.equipped.filter((x) => equipSlotOf(x) !== slot);

        next = {
          ...s,
          equipped: [...others, src],
        };
      }

      write(next);
      return next;
    });
  }, []);

  const setMissionPicks = useCallback((picks: string[]) => {
    setState((s) => {
      const next: UserState = { ...s, missionPicks: picks };
      write(next);
      return next;
    });
  }, []);

  const confirmMission = useCallback(() => {
    setState((s) => {
      const next: UserState = {
        ...s,
        missionConfirmed: [...s.missionPicks],
        missionSuccesses: [],
      };

      write(next);
      return next;
    });
  }, []);

  const toggleMissionSuccess = useCallback((idx: number) => {
    setState((s) => {
      const has = s.missionSuccesses.includes(idx);

      const next: UserState = {
        ...s,
        missionSuccesses: has
          ? s.missionSuccesses.filter((x) => x !== idx)
          : [...s.missionSuccesses, idx],
      };

      write(next);
      return next;
    });
  }, []);

  const resetTodayMission = useCallback(() => {
    setState((s) => {
      const next: UserState = {
        ...s,
        missionConfirmed: [],
        missionSuccesses: [],
      };

      write(next);
      return next;
    });
  }, []);

  return {
    ...state,
    setNickname,
    tryRenameNickname,
    setSetting,
    savePhoto,
    update,
    reset,
    buy,
    toggleEquip,
    setMissionPicks,
    confirmMission,
    toggleMissionSuccess,
    resetTodayMission,
    loseHeart,
    restoreHearts,
  };
}

// 카메라 사진을 작게 리사이즈해서 dataURL 반환
// EXIF orientation 자동 적용 — createImageBitmap 가능 시 imageOrientation: 'from-image'
// 사용. 폴백으로 기존 Image() 디코드.
export async function downscaleImage(file: File, max = 256): Promise<string> {
  // 1) modern path — EXIF 회전 자동 처리
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close?.();
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch {
      // 옵션 미지원 환경 → 폴백
    }
  }
  // 2) fallback — FileReader + Image (회전 X)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Image decode failed'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}