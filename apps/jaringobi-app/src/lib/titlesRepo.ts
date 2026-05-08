// 칭호 (titles 테이블).
// 기존 lib/data.ts 의 TITLES 상수를 DB 로 이관 — ID(h0~h11) 는 텍스트 PK 그대로 유지.
//
// schema (docs/SUPABASE.md 3-9):
//   titles(id text pk, name, difficulty, tagline, tip, icon_key, img,
//          reqs jsonb, sort_order, active, ...)
//
// img 는 정적 경로(/title/title_NN.png) 또는 title-images Storage public URL.
// reqs 는 TitleReq[] 직렬화. 평가 로직(getTitleProgress) 은 클라이언트가 그대로 담당.

import { getSupabase, isSupabaseEnabled } from './supabase';
import type { Title, TitleReq, TitleDifficulty } from './data';

interface TitleRow {
  id: string;
  name: string;
  difficulty: TitleDifficulty;
  tagline: string;
  tip: string;
  icon_key: string;
  img: string;
  reqs: unknown;
  sort_order: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

function isTitleReq(v: unknown): v is TitleReq {
  if (typeof v !== 'object' || v === null) return false;
  const t = (v as { type?: unknown }).type;
  if (t === 'mission') {
    const r = v as { missionId?: unknown; count?: unknown };
    return typeof r.missionId === 'string' && typeof r.count === 'number';
  }
  if (t === 'totalSaveCount') {
    return typeof (v as { count?: unknown }).count === 'number';
  }
  return t === 'cycleComplete';
}

function parseReqs(raw: unknown): TitleReq[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isTitleReq);
}

function rowToTitle(r: TitleRow): Title {
  return {
    id: r.id,
    name: r.name,
    difficulty: r.difficulty,
    tagline: r.tagline,
    tip: r.tip,
    iconKey: r.icon_key,
    img: r.img,
    reqs: parseReqs(r.reqs),
  };
}

interface TitleWithMeta extends Title {
  sortOrder: number;
  active: boolean;
}

function rowToTitleMeta(r: TitleRow): TitleWithMeta {
  return {
    ...rowToTitle(r),
    sortOrder: r.sort_order,
    active: r.active,
  };
}

function titleToRow(t: TitleWithMeta): Partial<TitleRow> {
  const row: Partial<TitleRow> = {
    id: t.id,
    name: t.name,
    difficulty: t.difficulty,
    tagline: t.tagline,
    tip: t.tip,
    icon_key: t.iconKey,
    img: t.img,
    reqs: t.reqs,
    sort_order: t.sortOrder,
    active: t.active,
    updated_at: new Date().toISOString(),
  };
  return row;
}

const BUCKET = 'title-images';

export interface TitlesRepo {
  /** 사용자용 — active 항목만 */
  listActive(): Promise<Title[]>;
  /** admin 용 — 전체 */
  listAll(): Promise<TitleWithMeta[]>;
  upsert(t: TitleWithMeta): Promise<TitleWithMeta>;
  remove(id: string): Promise<void>;
  /** 칭호 메인 이미지 업로드 → public URL */
  uploadImage(file: File): Promise<string>;
  subscribe(cb: () => void): () => void;
}

const localRepo: TitlesRepo = {
  async listActive() { return []; },
  async listAll() { return []; },
  async upsert(t) { return t; },
  async remove() { /* no-op */ },
  async uploadImage() { throw new Error('Storage 미설정 — Supabase 환경변수 필요'); },
  subscribe() { return () => {}; },
};

const supabaseRepo: TitlesRepo = {
  async listActive() {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from('titles')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('[titlesRepo.listActive] 실패', error);
      return [];
    }
    return (data ?? []).map((r: TitleRow) => rowToTitle(r));
  },

  async listAll() {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const { data, error } = await sb
      .from('titles')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('[titlesRepo.listAll] 실패', error);
      throw error;
    }
    return (data ?? []).map((r: TitleRow) => rowToTitleMeta(r));
  },

  async upsert(t) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const row = titleToRow(t);
    const { data, error } = await sb
      .from('titles')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error) {
      console.error('[titlesRepo.upsert] 실패', { row, error });
      throw error;
    }
    return rowToTitleMeta(data as TitleRow);
  },

  async remove(id) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const { error } = await sb.from('titles').delete().eq('id', id);
    if (error) {
      console.error('[titlesRepo.remove] 실패', { id, error });
      throw error;
    }
  },

  async uploadImage(file) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40);
    const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}.${ext}`;

    const { error: uploadErr } = await sb.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type || 'image/png' });
    if (uploadErr) {
      console.error('[titlesRepo.uploadImage] 업로드 실패', { path, uploadErr });
      throw uploadErr;
    }
    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
    if (!pub?.publicUrl) {
      throw new Error('업로드는 됐지만 public URL 을 못 받았어요. 버킷이 public 인지 확인하세요.');
    }
    return pub.publicUrl;
  },

  subscribe(cb) {
    const sb = getSupabase();
    if (!sb) return () => {};
    const channel = sb
      .channel('titles_changes')
      .on(
        'postgres_changes' as 'system',
        { event: '*', schema: 'public', table: 'titles' },
        () => cb(),
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  },
};

export const titlesRepo: TitlesRepo = isSupabaseEnabled() ? supabaseRepo : localRepo;
export type { TitleWithMeta };
