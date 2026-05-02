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
  cycle: number;        // 챌린지 회차 (1, 2, ...)
  day: number;          // 1..30
  photos: Record<number, string>; // 현 회차의 일자별 인증 사진 (dataURL)
  totalSaved: number;   // 누적 저축액
  goal: number;         // 회차 목표액
  coins: number;        // 보유 코인
  owned: string[];      // 보유 중인 상점 아이템 src 목록
  equipped: string[];   // 현재 장착(즐겨찾기) src 목록 (owned의 부분집합)
  missionPicks: string[]; // 오늘의 챌린지 미션 ID 목록 (Main↔Camera 공유)
  missionConfirmed: string[]; // 챌린지 확정 후 스냅샷 (비어있으면 미확정 상태)
  missionSuccesses: string[]; // 확정 미션 중 성공 표시한 ID
  activeTitleId: string;  // 마이페이지에서 표시할 칭호 ID
  settings: UserSettings;
}

const DEFAULT: UserState = {
  nickname: '자린이',
  cycle: 1,
  day: 1,
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
      missionSuccesses: parsed.missionSuccesses ?? DEFAULT.missionSuccesses,
      activeTitleId: parsed.activeTitleId ?? DEFAULT.activeTitleId,
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

  const setSetting = useCallback(<K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setState((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
  }, []);

  // 인증 사진 저장 → 보상(원/포인트) 계산해서 반환 (Camera 축하 팝업용).
  // 보상 규칙:
  //  · 노말(goal=300_000): 일평균 = goal/30 = 1만원 고정
  //  · 하드(goal>=1_000_000): 사용자가 확정한 missionConfirmed 미션 합계만큼 적립 (없으면 picks 합계)
  const savePhoto = useCallback((dataUrl: string) => {
    // 보상은 현재 state로 동기 계산 (return 즉시 정확한 값을 호출자에게 전달)
    const s = state;
    const isHard = s.goal >= 1_000_000;
    const ids = s.missionConfirmed.length > 0 ? s.missionConfirmed : s.missionPicks;
    const reward = isHard
      ? ids.reduce((sum, id) => sum + (MISSION_AMOUNTS[id] ?? 0), 0)
      : Math.round(s.goal / 30);
    const coins = 100;

    setState((cur) => {
      const day = cur.day;
      const next: UserState = {
        ...cur,
        photos: { ...cur.photos, [day]: dataUrl },
        day: Math.min(30, day + 1),
        totalSaved: cur.totalSaved + reward,
        coins: cur.coins + coins,
        // 인증 완료 시 오늘의 미션 확정/성공 상태 자동 리셋 → 메인 미션 버튼 다시 누르면 추천 패널
        missionConfirmed: [],
        missionSuccesses: [],
      };
      write(next);
      return next;
    });
    return { reward, coins };
  }, [state]);

  const reset = useCallback(() => {
    localStorage.removeItem(KEY);
    setState(DEFAULT);
  }, []);

  // 상점에서 구매: 코인 차감 + owned 추가. 이미 보유했거나 코인 부족이면 false.
  const buy = useCallback((src: string, price: number) => {
    let ok = false;
    setState((s) => {
      if (s.owned.includes(src)) return s;
      if (s.coins < price) return s;
      ok = true;
      const next = { ...s, coins: s.coins - price, owned: [...s.owned, src] };
      write(next);
      return next;
    });
    return ok;
  }, []);

  // 옷장에서 장착/해제 토글
  // 슬롯당 1개만 장착: 사치품/티셔츠/조명/소품/가구1/가구2/벽지 (총 7개 슬롯, 서로 동시 장착 가능)
  const toggleEquip = useCallback((src: string) => {
    setState((s) => {
      if (!s.owned.includes(src)) return s;
      let next: UserState;
      if (s.equipped.includes(src)) {
        next = { ...s, equipped: s.equipped.filter((x) => x !== src) };
      } else {
        const slot = equipSlotOf(src);
        const others = s.equipped.filter((x) => equipSlotOf(x) !== slot);
        next = { ...s, equipped: [...others, src] };
      }
      write(next);
      return next;
    });
  }, []);

  const setMissionPicks = useCallback((picks: string[]) => {
    setState((s) => {
      const next = { ...s, missionPicks: picks };
      write(next);
      return next;
    });
  }, []);

  // 챌린지 확정: missionPicks 스냅샷을 missionConfirmed로 복사, successes 초기화
  const confirmMission = useCallback(() => {
    setState((s) => {
      const next = { ...s, missionConfirmed: [...s.missionPicks], missionSuccesses: [] };
      write(next);
      return next;
    });
  }, []);

  // review 화면에서 성공 토글
  const toggleMissionSuccess = useCallback((id: string) => {
    setState((s) => {
      const has = s.missionSuccesses.includes(id);
      const next = {
        ...s,
        missionSuccesses: has
          ? s.missionSuccesses.filter((x) => x !== id)
          : [...s.missionSuccesses, id],
      };
      write(next);
      return next;
    });
  }, []);

  // 오늘 챌린지 완료/리셋: confirmed/successes 초기화
  const resetTodayMission = useCallback(() => {
    setState((s) => {
      const next = { ...s, missionConfirmed: [], missionSuccesses: [] };
      write(next);
      return next;
    });
  }, []);

  return {
    ...state,
    setNickname, setSetting, savePhoto, update, reset, buy, toggleEquip,
    setMissionPicks, confirmMission, toggleMissionSuccess, resetTodayMission,
  };
}

// 카메라 사진을 작게 리사이즈해서 dataURL 반환 (localStorage 용량 절약)
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
