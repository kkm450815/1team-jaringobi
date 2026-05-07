// 공지/이벤트 (announcements) 저장소.
//
// schema (docs/SUPABASE.md 3-6):
//   announcements(id, title, body, link_url?, link_label?, bg_color,
//                 active, starts_at?, ends_at?, sort_order, created_at, updated_at)
//
// 활성(active) = active=true AND now() BETWEEN starts_at..ends_at (양쪽 NULL 허용)

import { getSupabase, isSupabaseEnabled } from './supabase';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  linkUrl: string;
  linkLabel: string;
  bgColor: string;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
  bg_color: string;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

function rowToA(r: AnnouncementRow): Announcement {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    linkUrl: r.link_url ?? '',
    linkLabel: r.link_label ?? '',
    bgColor: r.bg_color,
    active: r.active,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function aToRow(a: Announcement): Partial<AnnouncementRow> {
  const row: Partial<AnnouncementRow> = {
    title: a.title,
    body: a.body,
    link_url: a.linkUrl || null,
    link_label: a.linkLabel || null,
    bg_color: a.bgColor,
    active: a.active,
    starts_at: a.startsAt || null,
    ends_at: a.endsAt || null,
    sort_order: a.sortOrder,
    updated_at: new Date().toISOString(),
  };
  if (a.id) row.id = a.id;
  return row;
}

export interface AnnouncementsRepo {
  /** 사용자 화면용 — 현재 활성인 공지만 (시간 + active 필터) */
  listActive(): Promise<Announcement[]>;
  /** 관리자용 — 전체 (비활성·예약 포함) */
  listAll(): Promise<Announcement[]>;
  upsert(a: Announcement): Promise<Announcement>;
  remove(id: string): Promise<void>;
  subscribe(cb: () => void): () => void;
}

const localRepo: AnnouncementsRepo = {
  async listActive() { return []; },
  async listAll() { return []; },
  async upsert(a) { return a; },
  async remove() { /* no-op */ },
  subscribe() { return () => {}; },
};

const supabaseRepo: AnnouncementsRepo = {
  async listActive() {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const nowIso = new Date().toISOString();
    const { data, error } = await sb
      .from('announcements')
      .select('*')
      .eq('active', true)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('[announcementsRepo.listActive] 실패', error);
      return [];
    }
    return (data ?? []).map((r: AnnouncementRow) => rowToA(r));
  },

  async listAll() {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const { data, error } = await sb
      .from('announcements')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('[announcementsRepo.listAll] 실패', error);
      throw error;
    }
    return (data ?? []).map((r: AnnouncementRow) => rowToA(r));
  },

  async upsert(a) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const row = aToRow(a);
    const { data, error } = await sb
      .from('announcements')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error) {
      console.error('[announcementsRepo.upsert] 실패', { row, error });
      throw error;
    }
    return rowToA(data as AnnouncementRow);
  },

  async remove(id) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const { error } = await sb.from('announcements').delete().eq('id', id);
    if (error) {
      console.error('[announcementsRepo.remove] 실패', { id, error });
      throw error;
    }
  },

  subscribe(cb) {
    const sb = getSupabase();
    if (!sb) return () => {};
    const channel = sb
      .channel('announcements_changes')
      .on(
        'postgres_changes' as 'system',
        { event: '*', schema: 'public', table: 'announcements' },
        () => cb(),
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  },
};

export const announcementsRepo: AnnouncementsRepo = isSupabaseEnabled() ? supabaseRepo : localRepo;
