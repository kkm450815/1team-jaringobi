import { useCallback, useEffect, useState } from 'react';
import { TalkPost } from './data';
import { talkPostsRepo } from './talkPostsRepo';

/**
 * 수다방 게시글 훅. talkPostsRepo 추상화를 통해 localStorage 또는 Supabase 자동 분기.
 *
 * - addPost: 낙관적 업데이트 → repo.add → 성공 시 DB 에서 반환된 row 로 교체 + 전체 재조회
 *   실패 시 rollback + onError 콜백 호출 (호출자가 alert/toast 노출 가능)
 * - 외부 변경(다른 탭, 다른 클라이언트의 INSERT/DELETE) 시 자동 새로고침
 */
export function useTalkPosts(roomId?: string) {
  const [posts, setPosts] = useState<TalkPost[]>([]);

  const refresh = useCallback(() => {
    let cancelled = false;
    talkPostsRepo
      .list(roomId)
      .then((next) => { if (!cancelled) setPosts(next); })
      .catch((err) => {
        console.error('[useTalkPosts.refresh] list 실패', err);
      });
    return () => { cancelled = true; };
  }, [roomId]);

  useEffect(() => {
    const cleanupRefresh = refresh();
    const unsub = talkPostsRepo.subscribe(() => { refresh(); });
    return () => {
      cleanupRefresh();
      unsub();
    };
  }, [refresh]);

  const addPost = useCallback(
    async (post: TalkPost, onError?: (err: Error) => void): Promise<TalkPost | null> => {
      // 낙관적 업데이트
      setPosts((prev) => [post, ...prev]);
      try {
        const saved = await talkPostsRepo.add(post);
        // 서버 반환 row 로 임시 항목 교체
        setPosts((prev) => prev.map((p) => (p.id === post.id ? saved : p)));
        // 작성 성공 후 DB 재조회 — Realtime 미설정 환경에서도 다른 사용자 글 갱신
        refresh();
        return saved;
      } catch (err) {
        console.error('[useTalkPosts.addPost] 실패', err);
        // 롤백
        setPosts((prev) => prev.filter((p) => p.id !== post.id));
        onError?.(err instanceof Error ? err : new Error(String(err)));
        return null;
      }
    },
    [refresh],
  );

  return { posts, addPost, refresh };
}
