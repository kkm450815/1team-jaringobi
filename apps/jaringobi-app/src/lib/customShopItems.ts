// 관리자가 추가한 상점 아이템의 전역 레지스트리.
//
// 기존 코드의 priceFor / fitSrc / categoryOf 같은 동기 함수들이 URL 문자열만
// 보고 분류·가격을 결정하는데, DB 아이템은 임의의 URL 이라 패턴으로 못 풀립니다.
// 해결: 앱 시작 시 1회 DB 에서 전체 active 항목을 받아 이 모듈에 채워두고,
// 위 동기 함수들이 이걸 먼저 참조.
//
// 변경 시 Realtime 으로 갱신.

import { ShopItem, shopItemsRepo } from './shopItemsRepo';

let registry: Map<string, ShopItem> = new Map(); // shop_image_url → item
const subscribers = new Set<() => void>();
let loadPromise: Promise<void> | null = null;

// data.ts 의 동기 함수(fitSrc/priceFor/등) 가 cycle 없이 참조하기 위한 전역 핸들.
// 항상 최신 registry 를 가리키도록 갱신.
function publishGlobal() {
  (globalThis as { __jaringobiCustomItems?: Map<string, ShopItem> }).__jaringobiCustomItems = registry;
}
publishGlobal();

/** Sync getter — 동기 함수에서 사용. 초기 로딩 전엔 빈 Map */
export function getCustomItem(shopUrl: string): ShopItem | undefined {
  return registry.get(shopUrl);
}

export function getAllCustomItems(): ShopItem[] {
  return [...registry.values()];
}

export function getCustomItemsByCategory(cat: ShopItem['category']): ShopItem[] {
  return [...registry.values()].filter((i) => i.category === cat);
}

/** 비동기 로드 — 실패해도 throw 안 함 (앱 시작 차단 방지) */
export async function loadCustomShopItems(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const items = await shopItemsRepo.listActive();
      registry = new Map(items.map((i) => [i.shopImageUrl, i]));
      publishGlobal();
      notify();
    } catch (e) {
      console.error('[loadCustomShopItems] 실패', e);
      registry = new Map();
    } finally {
      loadPromise = null;
    }
  })();
  return loadPromise;
}

/** Realtime / admin 변경 이후 강제 새로고침 */
export async function refreshCustomShopItems(): Promise<void> {
  try {
    const items = await shopItemsRepo.listActive();
    registry = new Map(items.map((i) => [i.shopImageUrl, i]));
    notify();
  } catch (e) {
    console.error('[refreshCustomShopItems] 실패', e);
  }
}

function notify() {
  for (const cb of subscribers) {
    try { cb(); } catch (e) { console.error('[customShopItems.notify] cb 에러', e); }
  }
}

/** 변경 구독 — useShopItemsVersion 같은 훅에서 사용 */
export function subscribeCustomShopItems(cb: () => void): () => void {
  subscribers.add(cb);
  return () => { subscribers.delete(cb); };
}

let realtimeUnsub: (() => void) | null = null;
export function startCustomShopItemsRealtime() {
  if (realtimeUnsub) return;
  realtimeUnsub = shopItemsRepo.subscribe(() => { refreshCustomShopItems(); });
}
export function stopCustomShopItemsRealtime() {
  if (realtimeUnsub) {
    realtimeUnsub();
    realtimeUnsub = null;
  }
}
