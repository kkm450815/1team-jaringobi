import { useCallback, useEffect, useState } from 'react';
import { equipSlotOf, getTitleProgress, MISSIONS, TITLES } from './data';

// 미션 ID → 보상 금액 룩업 (savePhoto 보상 계산용)
const MISSION_AMOUNTS: Record<string, number> = Object.fromEntries(
  MISSIONS.map((m) => [m.id, m.amount]),
);

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

  settings: UserSettings;
}

const MAX_HEARTS = 3;
const CYCLE_DAYS = 30;

const DEFAULT: UserState = {
  nickname: '자린이',
  cycle: 1,
  day: 1,
  hearts: MAX_HEARTS,
  photos: {},
  totalSaved: 10_000,
  goal: 300_000,
  coins: 180,
  owned: ['/shop/clothes/clo_shop_01.png', '/shop/clothes/clo_shop_51.png'],
  equipped: [],
  missionPicks: ['m2', 'm12', 'm13'],
  missionConfirmed: [],
  missionSuccesses: [],
  activeTitleId: 'h0',
  ownedTitles: ['h0'],
  missionWinDays: {},
  totalSaveCount: 0,
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
  //  · 노말(goal=300_000): 일평균 = goal/30 = 1만원 고정
  //  · 하드(goal>=1_000_000): 사용자가 확정한 missionConfirmed 미션 합계만큼 적립 (없으면 picks 합계)
  // 회차 종료(day===30 인증):
  //  · cycle++, day=1, photos={}, hearts=3 복구
  //  · cycleEnded=true 반환해 호출자가 "회차 완료" 축하 표시 가능
  const savePhoto = useCallback((dataUrl: string) => {
    const s = state;
    const isHard = s.goal >= 1_000_000;
    const ids = s.missionConfirmed.length > 0 ? s.missionConfirmed : s.missionPicks;

    const reward = isHard
      ? ids.reduce((sum, id) => sum + (MISSION_AMOUNTS[id] ?? 0), 0)
      : Math.round(s.goal / 30);

    const coins = 100;
    const isCycleEnd = s.day >= CYCLE_DAYS;

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
    return { reward, coins, cycleEnded: isCycleEnd, archive };
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