import { useCallback, useEffect, useState } from 'react';
import { TALK_POSTS, TalkPost } from './data';

const KEY = 'jaringobi.posts.v1';

// localStorage에는 사용자가 추가한 글만 저장. 시드(TALK_POSTS)는 항상 같이 보여줌.
function readUserPosts(): TalkPost[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TalkPost[]) : [];
  } catch {
    return [];
  }
}

function write(posts: TalkPost[]) {
  localStorage.setItem(KEY, JSON.stringify(posts));
}

/**
 * 수다방 게시글 영속화 훅.
 * - 시드 게시글(TALK_POSTS)은 항상 보임
 * - 사용자가 추가한 글은 localStorage에 저장되어 새로고침/페이지 이동 후에도 유지
 * - roomId 지정 시 그 방의 글만 반환 (사용자글 + 시드글 합쳐서)
 */
export function useTalkPosts(roomId?: string) {
  const [userPosts, setUserPosts] = useState<TalkPost[]>(() => readUserPosts());

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === KEY) setUserPosts(readUserPosts());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addPost = useCallback((post: TalkPost) => {
    setUserPosts((prev) => {
      const next = [post, ...prev];
      write(next);
      return next;
    });
  }, []);

  // 사용자글이 시드보다 위에 보이도록 (최신 글 = 사용자가 방금 쓴 것)
  const filtered = roomId
    ? [...userPosts.filter((p) => p.roomId === roomId), ...TALK_POSTS.filter((p) => p.roomId === roomId)]
    : [...userPosts, ...TALK_POSTS];

  return { posts: filtered, addPost };
}
