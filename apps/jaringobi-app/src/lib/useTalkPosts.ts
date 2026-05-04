import { useCallback, useEffect, useState } from 'react';
import { TalkPost } from './data';
import { talkPostsRepo } from './talkPostsRepo';

/**
 * 수다방 게시글 훅. talkPostsRepo 추상화를 통해 localStorage 또는 Supabase 자동 분기.
 * 미래 Supabase 연동 시 이 훅의 사용처는 그대로, repo 구현만 활성화하면 됨.
 *
 * - 시드 글 + 사용자 글 합쳐서 노출
 * - addPost: 새 글 추가 (낙관적 업데이트 후 repo 응답으로 재정렬)
 * - 외부 변경(다른 탭, 다른 클라이언트의 INSERT) 발생 시 자동 새로고침
 */
export function useTalkPosts(roomId?: string) {
  const [posts, setPosts] = useState<TalkPost[]>([]);

  const refresh = useCallback(() => {
    let cancelled = false;
    talkPostsRepo
      .list(roomId)
      .then((next) => { if (!cancelled) setPosts(next); })
      .catch(() => { /* 네트워크 오류 시 이전 상태 유지 */ });
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

  const addPost = useCallback((post: TalkPost) => {
    // 낙관적 업데이트
    setPosts((prev) => [post, ...prev]);
    talkPostsRepo
      .add(post)
      .catch(() => {
        // 실패 시 rollback
        setPosts((prev) => prev.filter((p) => p.id !== post.id));
      });
  }, []);

  return { posts, addPost };
}
