import { useCallback, useEffect, useState } from 'react';
import { equipSlotOf } from './data';

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
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const setNickname = useCallback((nickname: string) => {
    setState((s) => ({ ...s, nickname: nickname.trim() || s.nickname }));
  }, []);

  const setSetting = useCallback(<K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setState((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
  }, []);

  const savePhoto = useCallback((dataUrl: string) => {
    setState((s) => {
      const day = s.day;
      const newPhotos = { ...s.photos, [day]: dataUrl };
      const reward = Math.round(s.goal / 30); // 일평균 목표
      // 30일 끝 → 다음 회차로
      if (day >= 30) {
        return {
          ...s,
          photos: {},
          day: 1,
          cycle: s.cycle + 1,
          totalSaved: s.totalSaved + reward,
          coins: s.coins + 100,
        };
      }
      return {
        ...s,
        photos: newPhotos,
        day: day + 1,
        totalSaved: s.totalSaved + reward,
        coins: s.coins + 100,
      };
    });
  }, []);

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
      return { ...s, coins: s.coins - price, owned: [...s.owned, src] };
    });
    return ok;
  }, []);

  // 옷장에서 장착/해제 토글
  // 슬롯당 1개만 장착: 사치품/티셔츠/조명/소품/가구1/가구2/벽지 (총 7개 슬롯, 서로 동시 장착 가능)
  const toggleEquip = useCallback((src: string) => {
    setState((s) => {
      if (!s.owned.includes(src)) return s;
      if (s.equipped.includes(src)) {
        return { ...s, equipped: s.equipped.filter((x) => x !== src) };
      }
      const slot = equipSlotOf(src);
      const others = s.equipped.filter((x) => equipSlotOf(x) !== slot);
      return { ...s, equipped: [...others, src] };
    });
  }, []);

  return { ...state, setNickname, setSetting, savePhoto, update, reset, buy, toggleEquip };
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
