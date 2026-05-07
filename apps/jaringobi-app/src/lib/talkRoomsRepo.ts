// 수다방 리스트 (talk_rooms) 저장소.
//
// schema (docs/SUPABASE.md 3-5):
//   talk_rooms(id pk, title, icon, bg, sort_order, created_at, updated_at)
//
// data.ts 의 하드코딩 TALK_ROOMS 는 Supabase 미설정 시 폴백으로만 사용.

import { TALK_ROOMS } from './data';
import { getSupabase, isSupabaseEnabled } from './supabase';

export interface TalkRoom {
  id: string;
  title: string;
  icon: string;
  bg: string;
  sortOrder: number;
}

interface TalkRoomRow {
  id: string;
  title: string;
  icon: string | null;
  bg: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

function rowToRoom(r: TalkRoomRow): TalkRoom {
  return {
    id: r.id,
    title: r.title,
    icon: r.icon ?? '',
    bg: r.bg,
    sortOrder: r.sort_order,
  };
}

function roomToRow(r: TalkRoom): TalkRoomRow {
  return {
    id: r.id,
    title: r.title,
    icon: r.icon || null,
    bg: r.bg,
    sort_order: r.sortOrder,
  };
}

export interface TalkRoomsRepo {
  list(): Promise<TalkRoom[]>;
  upsert(room: TalkRoom): Promise<void>;
  remove(id: string): Promise<void>;
  subscribe(cb: () => void): () => void;
}

/* ---- localStorage / 시드 폴백 ---- */

const localRepo: TalkRoomsRepo = {
  async list() {
    return TALK_ROOMS.map((r, i) => ({
      id: r.id,
      title: r.title,
      icon: r.icon,
      bg: r.bg,
      sortOrder: i + 1,
    }));
  },
  async upsert() { /* no-op */ },
  async remove() { /* no-op */ },
  subscribe() { return () => {}; },
};

/* ---- Supabase 구현 ---- */

const supabaseRepo: TalkRoomsRepo = {
  async list() {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const { data, error } = await sb
      .from('talk_rooms')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('[talkRoomsRepo.list] 실패', error);
      throw error;
    }
    return (data ?? []).map((r: TalkRoomRow) => rowToRoom(r));
  },

  async upsert(room) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const row = { ...roomToRow(room), updated_at: new Date().toISOString() };
    const { error } = await sb.from('talk_rooms').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('[talkRoomsRepo.upsert] 실패', { row, error });
      throw error;
    }
  },

  async remove(id) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const { error } = await sb.from('talk_rooms').delete().eq('id', id);
    if (error) {
      console.error('[talkRoomsRepo.remove] 실패', { id, error });
      throw error;
    }
  },

  subscribe(cb) {
    const sb = getSupabase();
    if (!sb) return () => {};
    const channel = sb
      .channel('talk_rooms_changes')
      .on(
        'postgres_changes' as 'system',
        { event: '*', schema: 'public', table: 'talk_rooms' },
        () => cb(),
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  },
};

export const talkRoomsRepo: TalkRoomsRepo = isSupabaseEnabled() ? supabaseRepo : localRepo;
