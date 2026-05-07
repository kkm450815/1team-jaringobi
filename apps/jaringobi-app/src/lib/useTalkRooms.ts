import { useCallback, useEffect, useState } from 'react';
import { TalkRoom, talkRoomsRepo } from './talkRoomsRepo';

/**
 * 수다방 리스트 훅. talk_rooms 테이블 변경 시 자동 새로고침.
 */
export function useTalkRooms() {
  const [rooms, setRooms] = useState<TalkRoom[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(() => {
    let cancelled = false;
    talkRoomsRepo
      .list()
      .then((next) => { if (!cancelled) { setRooms(next); setError(null); } })
      .catch((e) => {
        console.error('[useTalkRooms.refresh] 실패', e);
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const cleanup = refresh();
    const unsub = talkRoomsRepo.subscribe(() => { refresh(); });
    return () => { cleanup(); unsub(); };
  }, [refresh]);

  return { rooms, error, refresh };
}
