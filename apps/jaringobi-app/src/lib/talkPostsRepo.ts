// 수다방 게시글 저장소 — Supabase 가 활성화돼 있으면 모든 클라이언트(데스크톱·모바일)에서
// 동일하게 talk_posts 테이블을 사용한다. localStorage 폴백은 Supabase 미설정 시에만 사용.
//
// 모바일에서 글이 안 올라가던 이슈 대응:
// - insert 실패 시 console.error 로 원인 출력 + 호출자에게 throw
// - id/nick/body/room_id 가 비어 있어도 안전한 기본값으로 채움
// - Realtime 구독이 없을 때를 대비해 호출자가 add 후 직접 list() 갱신할 수 있게 add 가
//   서버에서 echo 한 row 를 반환

import { TALK_POSTS, TalkPost } from './data';
import { getSupabase, isSupabaseEnabled } from './supabase';
import { newId } from './ids';

export interface TalkPostsRepo {
  list(roomId?: string): Promise<TalkPost[]>;
  add(post: TalkPost): Promise<TalkPost>;
  remove(id: string): Promise<void>;
  subscribe(cb: () => void): () => void;
}

/* ---------------- localStorage 구현 (Supabase 미설정 폴백) ---------------- */

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
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    return post;
  },
  async remove(id) {
    const next = readUserPosts().filter((p) => p.id !== id);
    writeUserPosts(next);
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
  },
  subscribe(cb) {
    function onStorage(e: StorageEvent) {
      if (e.key === KEY) cb();
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  },
};

/* ---------------- Supabase 구현 ---------------- */

interface TalkPostRow {
  id: string;
  room_id: string;
  nick: string;
  body: string;
  created_at?: string;
}

function rowToPost(r: TalkPostRow): TalkPost {
  return {
    id: r.id ?? newId(),
    roomId: r.room_id ?? '',
    nick: r.nick ?? '익명',
    body: r.body ?? '',
  };
}

// Supabase 의 talk_posts.id 컬럼은 uuid default gen_random_uuid().
// 클라이언트에서 newId() 가 폴백 비-uuid 문자열을 만들면 insert 가 깨지므로,
// uuid 형식이 아닐 때는 아예 id 를 보내지 않고 서버 디폴트에 맡긴다.
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function postToRow(p: TalkPost): Partial<TalkPostRow> {
  const row: Partial<TalkPostRow> = {
    room_id: (p.roomId ?? '').toString().trim() || 't1',
    nick: (p.nick ?? '').toString().trim() || '익명',
    body: (p.body ?? '').toString().trim() || '(빈 메시지)',
  };
  if (p.id && UUID_RE.test(p.id)) row.id = p.id;
  return row;
}

const supabaseRepo: TalkPostsRepo = {
  async list(roomId) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    let q = sb.from('talk_posts').select('*').order('created_at', { ascending: false });
    if (roomId) q = q.eq('room_id', roomId);
    const { data, error } = await q;
    if (error) {
      console.error('[talkPostsRepo.list] Supabase select 실패', error);
      throw error;
    }
    // 시드(TALK_POSTS) 는 더 이상 섞지 않음 — 실서비스에선 실제 DB 글만 노출.
    // 시드는 Supabase 미설정 폴백(localRepo) 에서만 데모용으로 사용.
    return (data ?? []).map((r: TalkPostRow) => rowToPost(r));
  },
  async add(post) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const row = postToRow(post);
    const { data, error } = await sb
      .from('talk_posts')
      .insert(row)
      .select()
      .single();
    if (error) {
      console.error('[talkPostsRepo.add] Supabase insert 실패', { error, row });
      throw error;
    }
    return rowToPost(data as TalkPostRow);
  },
  async remove(id) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const { error } = await sb.from('talk_posts').delete().eq('id', id);
    if (error) {
      console.error('[talkPostsRepo.remove] Supabase delete 실패', { error, id });
      throw error;
    }
  },
  subscribe(cb) {
    const sb = getSupabase();
    if (!sb) return () => {};
    const channel = sb
      .channel('talk_posts_changes')
      .on(
        'postgres_changes' as 'system',
        { event: '*', schema: 'public', table: 'talk_posts' },
        () => cb(),
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  },
};

/* ---------------- export ---------------- */

export const talkPostsRepo: TalkPostsRepo = isSupabaseEnabled() ? supabaseRepo : localRepo;
export const isUsingSupabase = isSupabaseEnabled();
