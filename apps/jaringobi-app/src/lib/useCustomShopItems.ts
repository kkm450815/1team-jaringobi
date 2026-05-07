// customShopItems 레지스트리가 바뀔 때마다 컴포넌트 리렌더 트리거.

import { useEffect, useState } from 'react';
import { getAllCustomItems, subscribeCustomShopItems } from './customShopItems';
import type { ShopItem } from './shopItemsRepo';

export function useCustomShopItems(): ShopItem[] {
  const [items, setItems] = useState<ShopItem[]>(() => getAllCustomItems());
  useEffect(() => {
    const unsub = subscribeCustomShopItems(() => setItems(getAllCustomItems()));
    // 마운트 시점에 이미 로드돼 있다면 한 번 더 동기화
    setItems(getAllCustomItems());
    return unsub;
  }, []);
  return items;
}
