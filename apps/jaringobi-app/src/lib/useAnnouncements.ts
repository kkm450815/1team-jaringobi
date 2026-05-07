import { useCallback, useEffect, useState } from 'react';
import { Announcement, announcementsRepo } from './announcementsRepo';

/**
 * 메인 화면에서 보여줄 활성 공지 목록.
 * announcements 테이블 변경 시 자동 갱신.
 */
export function useActiveAnnouncements() {
  const [items, setItems] = useState<Announcement[] | null>(null);

  const refresh = useCallback(() => {
    let cancelled = false;
    announcementsRepo
      .listActive()
      .then((next) => { if (!cancelled) setItems(next); })
      .catch((e) => {
        console.error('[useActiveAnnouncements.refresh] 실패', e);
        if (!cancelled) setItems([]);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const cleanup = refresh();
    const unsub = announcementsRepo.subscribe(() => { refresh(); });
    return () => { cleanup(); unsub(); };
  }, [refresh]);

  return items;
}
