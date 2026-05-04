// 수다방 게시글 저장소 추상화. localStorage 또는 Supabase 백엔드를 동일 인터페이스로 노출.
// useTalkPosts는 이 모듈만 의존 → Supabase 연동 시 이 파일만 수정하면 됨.

import { TALK_POSTS, TalkPost } from './data';
import { getSupabase, isSupabaseEnabled } from './supabase';

export interface TalkPostsRepo {
  /** 모든 글 조회 (시드 + 사용자 작성) */
  list(roomId?: string): Promise<TalkPost[]>;
  /** 글 추가 — 성공 시 저장된 post 반환 (서버에서 id를 발급할 수 있어 echo) */
  add(post: TalkPost): Promise<TalkPost>;
  /** 변경 구독 — 새 글이 들어올 때마다 cb 호출. unsubscribe 함수 반환 */
  subscribe(cb: () => void): () => void;
}

/* ---------------- localStorage 구현 (현재 기본값) ---------------- */

const KEY = 'jaringobi.posts.v1';

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

function writeUserPosts(posts: TalkPost[]) {
  localStorage.setItem(KEY, JSON.stringify(posts));
}

const localRepo: TalkPostsRepo = {
  async list(roomId) {
    const userPosts = readUserPosts();
    const all = [...userPosts, ...TALK_POSTS];
    return roomId ? all.filter((p) => p.roomId === roomId) : all;
  },
  async add(post) {
    const next = [post, ...readUserPosts()];
    writeUserPosts(next);
    // 같은 탭 안에서도 listener 깨우기 위해 storage 이벤트 수동 디스패치
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    return post;
  },
  subscribe(cb) {
    function onStorage(e: StorageEvent) {
      if (e.key === KEY) cb();
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  },
};

/* ---------------- Supabase 구현 (환경변수 설정 시 활성) ---------------- */

// docs/SUPABASE.md 의 talk_posts 테이블과 1:1 매핑.
// 패키지 설치 + 환경변수 + 스키마 적용 후 아래 주석 해제하면 자동으로 활성화됨.

const supabaseRepo: TalkPostsRepo = {
  async list(_roomId) {
    // const sb = getSupabase() as any;
    // let q = sb.from('talk_posts').select('*').order('created_at', { ascending: false });
    // if (_roomId) q = q.eq('room_id', _roomId);
    // const { data, error } = await q;
    // if (error) throw error;
    // return (data ?? []).map(rowToPost);
    void getSupabase();
    return [];
  },
  async add(post) {
    // const sb = getSupabase() as any;
    // const { data, error } = await sb.from('talk_posts').insert(postToRow(post)).select().single();
    // if (error) throw error;
    // return rowToPost(data);
    return post;
  },
  subscribe(_cb) {
    // const sb = getSupabase() as any;
    // const channel = sb.channel('talk_posts_changes')
    //   .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'talk_posts' }, () => _cb())
    //   .subscribe();
    // return () => sb.removeChannel(channel);
    return () => {};
  },
};

// function rowToPost(r: { id: string; room_id: string; nick: string; body: string }): TalkPost {
//   return { id: r.id, roomId: r.room_id, nick: r.nick, body: r.body };
// }
// function postToRow(p: TalkPost) {
//   return { id: p.id, room_id: p.roomId, nick: p.nick, body: p.body };
// }

/* ---------------- export ---------------- */

export const talkPostsRepo: TalkPostsRepo = isSupabaseEnabled() ? supabaseRepo : localRepo;
