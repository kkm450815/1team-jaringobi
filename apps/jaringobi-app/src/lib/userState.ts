import { useCallback, useEffect, useState } from 'react';
import { equipSlotOf, MISSIONS } from './data';

// 미션 ID → 보상 금액 룩업 (savePhoto 보상 계산용)
const MISSION_AMOUNTS: Record<string, number> = Object.fromEntries(
  MISSIONS.map((m) => [m.id, m.amount]),
);

const KEY = 'jaringobi.user.v1';

export interface UserSettings {
  notifyChallenge: boolean;
  notifyHeart: boolean;
  sound: boolean;
  vibration: boolean;
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
  owned: ['/shop/clothes/clo_shop_01.png'],
  equipped: [],
  missionPicks: ['m2', 'm12', 'm13'],
  missionConfirmed: [],
  missionSuccesses: [],
  activeTitleId: 'h1',
  ownedTitles: ['h1'],
  settings: {
    notifyChallenge: true,
    notifyHeart: true,
    sound: true,
    vibration: false,
  },
};

function read(): UserState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;

    const parsed = JSON.parse(raw) as Partial<UserState>;

    return {
      ...DEFAULT,
      ...parsed,
      settings: { ...DEFAULT.settings, ...(parsed.settings ?? {}) },
      photos: parsed.photos ?? {},
      owned: parsed.owned ?? DEFAULT.owned,
      equipped: parsed.equipped ?? DEFAULT.equipped,
      missionPicks: parsed.missionPicks ?? DEFAULT.missionPicks,
      missionConfirmed: parsed.missionConfirmed ?? DEFAULT.missionConfirmed,

      // 기존 저장값 중 string[]이 들어왔을 가능성 방지
      missionSuccesses: (parsed.missionSuccesses ?? DEFAULT.missionSuccesses).filter(
        (v): v is number => typeof v === 'number',
      ),

      activeTitleId: parsed.activeTitleId ?? DEFAULT.activeTitleId,
      ownedTitles: parsed.ownedTitles ?? DEFAULT.ownedTitles,
      hearts: typeof parsed.hearts === 'number' ? parsed.hearts : DEFAULT.hearts,
    };
  } catch {
    return DEFAULT;
  }
}

function write(s: UserState) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function useUser() {
  const [state, setState] = useState<UserState>(() => read());

  useEffect(() => {
    write(state);
  }, [state]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === KEY) setState(read());
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = useCallback((patch: Partial<UserState>) => {
    setState((s) => {
      const next = { ...s, ...patch };
      write(next);
      return next;
    });
  }, []);

  const setNickname = useCallback((nickname: string) => {
    setState((s) => ({ ...s, nickname: nickname.trim() || s.nickname }));
  }, []);

  const setSetting = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      setState((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
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
      // 회차 완주 시 칭호 자동 획득: 회차 N → h(N+1) (h2~h9 까지)
      const cycleEndTitleId = isCycleEnd ? `h${Math.min(9, cur.cycle + 1)}` : null;
      const ownedTitles = cycleEndTitleId && !cur.ownedTitles.includes(cycleEndTitleId)
        ? [...cur.ownedTitles, cycleEndTitleId]
        : cur.ownedTitles;
      const next: UserState = isCycleEnd
        ? {
            ...cur,
            photos: {}, // 회차 종료 → 캘린더 초기화
            day: 1,
            cycle: cur.cycle + 1,
            hearts: MAX_HEARTS, // 새 회차 양심 복구
            totalSaved: cur.totalSaved + reward,
            coins: cur.coins + coins,
            missionConfirmed: [],
            missionSuccesses: [],
            ownedTitles,
          }
        : {
            ...cur,
            photos: photosWithToday,
            day: day + 1,
            totalSaved: cur.totalSaved + reward,
            coins: cur.coins + coins,
            missionConfirmed: [],
            missionSuccesses: [],
          };
      write(next);
      return next;
    });
    return { reward, coins, cycleEnded: isCycleEnd };
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
export function downscaleImage(file: File, max = 256): Promise<string> {
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